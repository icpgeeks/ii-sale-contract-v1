use common_canister_impl::components::identity::api::{AccountInfo, GetAccountsError};
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
// State: GetHolderContractAccounts
// ---------------------------------------------------------------------------
// Fetches the list of all II accounts for the captured identity on the
// capture hostname.  Transitions to CheckHolderContractPrincipals with the
// full list of account numbers to verify.

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Holder contract accounts: fetching accounts list ...");

    let (identity_number, frontend_hostname, sender) = get_holder_model(|_, model| {
        let frontend_hostname = match &model.state.value {
            HolderState::Capture {
                sub_state: CaptureState::GetHolderContractAccounts { frontend_hostname },
                ..
            } => frontend_hostname.clone(),
            _ => panic!("get_holder_contract_accounts::process: unexpected state"),
        };
        (
            model.identity_number.unwrap(),
            frontend_hostname,
            model.get_request_sender(),
        )
    });

    // Fetch the full accounts list for this identity + origin.
    // If our key is no longer in the identity, II will return Unauthorized — handled below.
    let request_definition = env
        .get_identity()
        .build_get_accounts_request(&identity_number, frontend_hostname.clone());

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

    let get_accounts_result = env
        .get_identity()
        .decode_get_accounts_response(&response_data)
        .map_err(to_internal_error)?;

    let accounts: Vec<AccountInfo> = match get_accounts_result {
        Ok(accounts) => accounts,
        Err(GetAccountsError::InternalCanisterError(reason)) => {
            return Err(to_ic_agent_error(reason));
        }
        Err(GetAccountsError::Unauthorized(_principal)) => {
            log_info!(env, "Holder contract accounts: get_accounts unauthorized.");
            update_holder(
                lock,
                HolderProcessingEvent::Capturing {
                    event: CaptureProcessingEvent::GetHolderContractPrincipalUnauthorized,
                },
            )?;
            return Ok(ProcessingResult::Continue);
        }
    };

    // Build the list of account numbers to check.
    // If the response is empty, the only account is the synthetic default (None).
    let accounts_to_check: Vec<Option<IdentityAccountNumber>> = if accounts.is_empty() {
        vec![None]
    } else {
        accounts.iter().map(|a| a.account_number).collect()
    };

    log_info!(
        env,
        "Holder contract accounts: {} account(s) to check: {:?}",
        accounts_to_check.len(),
        accounts_to_check
    );

    update_holder(
        lock,
        HolderProcessingEvent::Capturing {
            event: CaptureProcessingEvent::AccountsForPrincipalCheckGot { accounts_to_check },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
