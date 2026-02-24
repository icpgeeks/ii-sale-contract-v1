use contract_canister_api::types::holder::{
    FetchAssetsEvent, HolderProcessingError, HolderProcessingEvent, HolderState,
    HoldingProcessingEvent, HoldingState, ObtainDelegationEvent, SaleDeal, SaleDealState,
};
use std::{cmp::min, fmt::Debug, rc::Rc, time::Duration};

use crate::{
    components::Environment,
    log_error, log_info,
    model::holder::{HolderLock, HolderModel},
    mutate_state, read_state,
    state::CanisterState,
};

use common_canister_impl::{
    components::{rand::RandGenerator, time::Time},
    handlers::{
        build_ic_agent_request,
        ic_agent::{sleeper, IcAgentRequest},
        ic_request::builder::{BuildRequestEnvironment, BuildRequestError, RequestSender},
        IcAgentRequestDefinition,
    },
};

pub mod cancel_sale_deal;
pub mod check_accounts_for_no_approve_prepare;
pub mod check_accounts_for_no_approve_sequential;
pub mod check_confirmation_holder_registration_expiry;
pub mod check_confirmation_owner_registration_expiry;
pub mod check_quarantine_completed;
pub mod confirm_authn_method_registration;
pub mod create_ecdsa_key;
pub mod delete_holder_authn_method;
pub mod delete_identity_authn_methods;
pub mod delete_neurons_hotkeys;
pub mod enter_authn_method_registration_mode;
pub mod exit_and_register_holder_authn_method;
pub mod exit_orphaned_registration_mode;
pub mod finish_capture;
pub mod finish_check_assets;
pub mod finish_fetch_assets;
pub mod get_accounts_balances;
pub mod get_accounts_information;
pub mod get_holder_contract_principal;
pub mod get_identity_accounts;
pub mod get_neurons_ids;
pub mod get_neurons_information;
pub mod obtain_identity_authn_methods;
pub mod prepare_delegation;
pub mod process_holding_state;
pub mod refund_buyer_from_transit_account;
pub mod register_holder_authn_method_session;
pub mod resolve_referral_reward_data;
pub mod sleep_processing;
pub mod start_accept_sale_deal;
pub mod start_capture;
pub mod start_check_assets;
pub mod start_fetch_assets;
pub mod start_holding;
pub mod start_release;
pub mod transfer_developer_reward;
pub mod transfer_hub_reward;
pub mod transfer_referral_reward;
pub mod transfer_sale_deal_amount_to_seller_account;
pub mod transfer_sale_deal_amount_to_transit_account;
pub mod validate_assets;

fn update_holder(
    lock: &HolderLock,
    event: HolderProcessingEvent,
) -> Result<(), HolderProcessingError> {
    mutate_state(|state| {
        let env = state.get_env();
        state
            .get_model_mut()
            .get_holder_mut()
            .update_holder(
                env.get_time().get_current_unix_epoch_time_millis(),
                lock,
                event,
            )
            .map_err(|_| HolderProcessingError::UpdateHolderError)
    })
}

pub(crate) fn get_holder_model<D, S>(supplier: S) -> D
where
    S: FnOnce(&CanisterState, &HolderModel) -> D,
{
    read_state(|state| supplier(state, state.get_model().get_holder().get_holder_model()))
}

pub(crate) fn get_trading_sale_deal<D, S>(supplier: S) -> D
where
    S: FnOnce(&CanisterState, &HolderModel, Option<&SaleDeal>) -> D,
{
    get_holder_model(|state, model| {
        let sale_deal = if matches!(
            model.state.value,
            HolderState::Holding {
                sub_state: HoldingState::Hold {
                    sale_deal_state: Some(SaleDealState::Trading),
                    quarantine: None,
                }
            }
        ) {
            let sale_deal = model.sale_deal.as_ref();
            let now = state
                .get_env()
                .get_time()
                .get_current_unix_epoch_time_millis();
            if now < sale_deal.unwrap().expiration_time {
                sale_deal
            } else {
                None
            }
        } else {
            None
        };
        supplier(state, model, sale_deal)
    })
}

pub async fn execute_ic_agent_request(
    env: &Environment,
    request: IcAgentRequest,
) -> Result<Vec<u8>, HolderProcessingError> {
    let transform_canister_id = env.get_ic().get_canister();
    let poll_duration = Duration::from_millis(env.get_settings().ic_agent_request_poll_delay);
    let rand_generator = env.get_rand_generator();
    let time = env.get_time();

    env.get_ic_agent()
        .execute_ic_agent_request(
            env.get_settings().ic_url.clone(),
            Box::new(move || {
                Box::pin(wait_duration(
                    rand_generator.clone(),
                    time.clone(),
                    poll_duration,
                ))
            }),
            request,
            transform_canister_id,
            "transform_http_response".to_owned(),
        )
        .await
        .map_err(to_ic_agent_error)
}

async fn wait_duration(
    rand_generator: Rc<dyn RandGenerator>,
    time: Rc<dyn Time>,
    duration: Duration,
) {
    sleeper::sleep(rand_generator.as_ref(), time.as_ref(), duration).await;
}

fn error_to_string<E: Debug>(error: E) -> String {
    let error = format!("{error:?}");
    error[0..min(error.len(), 1024)].into()
}

fn to_ic_agent_error<E: Debug>(error: E) -> HolderProcessingError {
    HolderProcessingError::IcAgentError {
        error: error_to_string(error),
        retry_delay: None,
    }
}

fn to_internal_error<E: Debug>(error: E) -> HolderProcessingError {
    HolderProcessingError::InternalError {
        error: error_to_string(error),
    }
}

async fn build_ic_agent_request_with_check_delegation(
    env: &Environment,
    lock: &HolderLock,
    request_definition: IcAgentRequestDefinition,
    sender: RequestSender,
) -> Result<IcAgentRequest, HolderProcessingError> {
    match build_ic_agent_request(env, request_definition, sender).await {
        Ok(request) => Ok(request),
        Err(BuildRequestError::DelegationExpired) => {
            log_info!(env, "Delegation was expired. Recreate delegation ...");
            if let Err(update_error) = update_holder(
                lock,
                HolderProcessingEvent::Holding {
                    event: HoldingProcessingEvent::FetchAssets {
                        event: FetchAssetsEvent::ObtainDelegation {
                            event: ObtainDelegationEvent::DelegationLost,
                        },
                    },
                },
            ) {
                log_error!(
                    env,
                    "Can not update holder state to delegation lost: {update_error:?}"
                );
            }
            Err(HolderProcessingError::DelegationExpired)
        }
        Err(BuildRequestError::BuildError { reason }) => {
            Err(HolderProcessingError::InternalError { error: reason })
        }
    }
}
