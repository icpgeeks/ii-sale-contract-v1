use std::time::Duration;

use candid::Principal;
use common_canister_impl::components::identity::api::AccountDelegationError;
use common_canister_impl::handlers::build_ic_agent_request;
use contract_canister_api::types::holder::{
    CaptureProcessingEvent, CaptureState, HolderProcessingError, HolderProcessingEvent,
    HolderState, IdentityAccountNumber,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{
    execute_ic_agent_request, get_holder_model, to_ic_agent_error, to_internal_error, update_holder,
};
use crate::log_info;
use crate::model::holder::HolderLock;

// ---------------------------------------------------------------------------
// Result type for get_account_principal — separates Unauthorized (device lost)
// from a derivable principal so that process() can emit the right event.
// ---------------------------------------------------------------------------
enum AccountPrincipalResult {
    Principal(Principal),
    Unauthorized,
}

// ---------------------------------------------------------------------------
// State: CheckHolderContractPrincipals
// ---------------------------------------------------------------------------
// Checks one account per tick.  For each account derives its principal and
// compares it against the contract owner.  If any principal matches the owner,
// the capture is aborted with DangerousToLoseIdentity.  When all accounts have
// been verified without a match the capture proceeds to
// ObtainingIdentityAuthnMethods.

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let (identity_number, frontend_hostname, first_account, device_key, sender, owner) =
        get_holder_model(|_, model| {
            let (frontend_hostname, accounts_to_check) = match &model.state.value {
                HolderState::Capture {
                    sub_state:
                        CaptureState::CheckHolderContractPrincipals {
                            frontend_hostname,
                            accounts_to_check,
                        },
                    ..
                } => (frontend_hostname.clone(), accounts_to_check.clone()),
                _ => panic!("check_holder_contract_principals::process: unexpected state"),
            };

            // first_account is Option<Option<u64>>:
            //   None          → list is empty, all accounts checked
            //   Some(None)    → default (synthetic) account
            //   Some(Some(n)) → numbered account n
            let first_account = accounts_to_check.first().copied();

            (
                model.identity_number.unwrap(),
                frontend_hostname,
                first_account,
                model.get_ecdsa_as_asn1_block_public_key(),
                model.get_request_sender(),
                model.owner.as_ref().unwrap().value,
            )
        });

    // If the list is empty, all accounts have been checked — no conflict found.
    let Some(current_account) = first_account else {
        log_info!(
            env,
            "Check holder contract principals: all accounts checked, no owner conflict."
        );
        update_holder(
            lock,
            HolderProcessingEvent::Capturing {
                event: CaptureProcessingEvent::HolderContractPrincipalCheckPassed,
            },
        )?;
        return Ok(ProcessingResult::Continue);
    };

    let account_principal_result = get_account_principal(
        env,
        identity_number,
        frontend_hostname.clone(),
        current_account,
        device_key,
        sender,
    )
    .await?;

    let principal = match account_principal_result {
        AccountPrincipalResult::Unauthorized => {
            log_info!(
                env,
                "Holder contract principals: account {:?} — unauthorized, device lost.",
                current_account
            );
            update_holder(
                lock,
                HolderProcessingEvent::Capturing {
                    event: CaptureProcessingEvent::GetHolderContractPrincipalUnauthorized,
                },
            )?;
            return Ok(ProcessingResult::Continue);
        }
        AccountPrincipalResult::Principal(p) => p,
    };

    log_info!(
        env,
        "Holder contract principals: account {:?} → principal {}",
        current_account,
        principal.to_text()
    );

    if principal == owner {
        log_info!(
            env,
            "Check holder contract principals: account {:?} principal matches owner — dangerous!",
            current_account
        );
        update_holder(
            lock,
            HolderProcessingEvent::Capturing {
                event: CaptureProcessingEvent::HolderContractPrincipalIsHolderOwner {
                    account_number: current_account,
                },
            },
        )?;
        return Ok(ProcessingResult::Continue);
    }

    // Not a match — advance to the next account.
    log_info!(
        env,
        "Check holder contract principals: account {:?} is safe, moving to next.",
        current_account
    );
    update_holder(
        lock,
        HolderProcessingEvent::Capturing {
            event: CaptureProcessingEvent::AccountPrincipalChecked {
                account_number: current_account,
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Derives the principal for a given II account.
///
/// - `None`    → calls the legacy `get_principal` (default / synthetic account).
/// - `Some(n)` → calls `prepare_account_delegation` with a minimal TTL and
///               computes `Principal::self_authenticating(user_key)`.
///               The side-effect (a short-lived delegation entry in II state)
///               expires after 1 second and is harmless.
async fn get_account_principal(
    env: &Environment,
    identity_number: u64,
    frontend_hostname: String,
    account_number: Option<IdentityAccountNumber>,
    device_key: Vec<u8>,
    sender: common_canister_impl::handlers::ic_request::builder::RequestSender,
) -> Result<AccountPrincipalResult, HolderProcessingError> {
    match account_number {
        None => {
            // Default account — use the legacy get_principal query.
            // get_principal does not return an Unauthorized variant; any error
            // is a genuine IC-agent failure and should be retried.
            let request_definition = env
                .get_identity()
                .build_get_principal_request(&identity_number, &frontend_hostname);

            let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
                .await
                .map_err(to_internal_error)?;

            let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

            env.get_identity()
                .decode_get_principal_response(&response_data)
                .map_err(to_internal_error)
                .map(AccountPrincipalResult::Principal)
        }
        Some(n) => {
            // Numbered account — prepare a 1-second delegation to obtain the
            // account-specific user_key, then derive the principal from it.
            let request_definition = env.get_identity().build_prepare_account_delegation_request(
                &identity_number,
                frontend_hostname,
                Some(n),
                device_key,
                Duration::from_secs(1),
            );

            let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
                .await
                .map_err(to_internal_error)?;

            let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

            let prepare_result = env
                .get_identity()
                .decode_prepare_account_delegation_response(&response_data)
                .map_err(to_internal_error)?;

            match prepare_result {
                Ok(delegation) => Ok(AccountPrincipalResult::Principal(
                    Principal::self_authenticating(&delegation.user_key),
                )),
                Err(AccountDelegationError::NoSuchDelegation) => {
                    Err(HolderProcessingError::InternalError {
                        error: format!(
                            "check_holder_contract_principals: no such delegation for account {:?}",
                            n
                        ),
                    })
                }
                Err(AccountDelegationError::Unauthorized(_principal)) => {
                    // Our ECDSA key is no longer authorised on this identity —
                    // treat this the same as get_accounts returning Unauthorized.
                    Ok(AccountPrincipalResult::Unauthorized)
                }
                Err(AccountDelegationError::InternalCanisterError(reason)) => {
                    Err(to_ic_agent_error(reason))
                }
            }
        }
    }
}
