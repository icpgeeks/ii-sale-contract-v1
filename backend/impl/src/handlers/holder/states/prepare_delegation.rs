use std::time::Duration;

use candid::Principal;
use common_canister_impl::components::identity::api::AccountDelegationError;
use common_canister_impl::handlers::build_ic_agent_request;
use common_canister_impl::handlers::ic_request::builder::build_query_request;
use contract_canister_api::types::holder::{
    DelegationData, DelegationState, FetchAssetsEvent, FetchAssetsState,
    FetchIdentityAccountsNnsAssetsState, FetchNnsAssetsState, HolderProcessingError,
    HolderProcessingEvent, HolderState, HoldingProcessingEvent, HoldingState,
    ObtainDelegationEvent,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{
    execute_ic_agent_request, get_holder_model, to_internal_error, update_holder,
};
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Delegation: preparing ...");

    let (identity_number, hostname, identity_account_number, device_key, sender) =
        get_holder_model(|_, model| {
            let (hostname, identity_account_number) = match &model.state.value {
                HolderState::Holding {
                    sub_state:
                        HoldingState::FetchAssets {
                            fetch_assets_state:
                                FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                                    sub_state:
                                        FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                                            sub_state:
                                                FetchNnsAssetsState::ObtainDelegationState {
                                                    sub_state:
                                                        DelegationState::NeedPrepareDelegation {
                                                            hostname,
                                                            identity_account_number,
                                                        },
                                                    ..
                                                },
                                            ..
                                        },
                                },
                            ..
                        },
                } => (hostname.clone(), *identity_account_number),
                _ => panic!("prepare_delegation: unexpected state"),
            };

            (
                model.identity_number.unwrap(),
                hostname,
                identity_account_number,
                model.get_ecdsa_as_asn1_block_public_key(),
                model.get_request_sender(),
            )
        });

    let request_definition = env.get_identity().build_prepare_account_delegation_request(
        &identity_number,
        hostname.clone(),
        identity_account_number,
        device_key.clone(),
        Duration::from_millis(env.get_settings().delegation_prepare_duration),
    );

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender.clone())
        .await
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

    let prepare_result = env
        .get_identity()
        .decode_prepare_account_delegation_response(&response_data)
        .map_err(to_internal_error)?;

    let (delegation_public_key, delegation_timestamp) = match prepare_result {
        Ok(delegation) => (delegation.user_key.to_vec(), delegation.expiration),
        Err(AccountDelegationError::NoSuchDelegation) => {
            return Err(HolderProcessingError::InternalError {
                error: format!(
                    "prepare_delegation: no such delegation for account {:?}",
                    identity_account_number
                ),
            });
        }
        Err(AccountDelegationError::Unauthorized(principal)) => {
            return Err(HolderProcessingError::InternalError {
                error: format!(
                    "prepare_delegation: unauthorized, principal: {}",
                    principal.to_text()
                ),
            });
        }
        Err(AccountDelegationError::InternalCanisterError(reason)) => {
            return Err(HolderProcessingError::InternalError { error: reason });
        }
    };

    let get_delegation_request = build_query_request(
        env,
        env.get_identity().build_get_delegation_request(
            &identity_number,
            hostname.clone(),
            device_key,
            delegation_timestamp.into(),
        ),
        sender,
    )
    .await
    .map_err(to_internal_error)?;

    log_info!(
        env,
        "Delegation: prepared for host '{hostname}', account {:?}, principal: {}.",
        identity_account_number,
        Principal::self_authenticating(&delegation_public_key).to_text()
    );

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::ObtainDelegation {
                    event: ObtainDelegationEvent::DelegationPrepared {
                        get_delegation_request,
                        delegation_data: DelegationData {
                            hostname,
                            public_key: delegation_public_key,
                            timestamp: delegation_timestamp.into(),
                            signature: None,
                        },
                    },
                },
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
