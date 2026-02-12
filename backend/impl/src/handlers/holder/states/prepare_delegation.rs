use std::time::Duration;

use candid::Principal;
use common_canister_impl::handlers::build_ic_agent_request;
use common_canister_impl::handlers::ic_request::builder::build_query_request;
use contract_canister_api::types::holder::{
    DelegationData, DelegationState, FetchAssetsEvent, FetchAssetsState, HolderProcessingError,
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

    let (identity_number, hostname, device_key, sender) = get_holder_model(|_, model| {
        let hostname = match &model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::FetchAssets {
                        fetch_assets_state:
                            FetchAssetsState::ObtainDelegationState {
                                sub_state: DelegationState::NeedPrepareDelegation { hostname },
                                ..
                            },
                        ..
                    },
            } => hostname,
            _ => panic!(),
        };

        (
            model.identity_number.unwrap(),
            hostname.clone(),
            model.get_ecdsa_as_asn1_block_public_key(),
            model.get_request_sender(),
        )
    });

    let request_definition = env.get_identity().build_prepare_delegation_request(
        &identity_number,
        hostname.clone(),
        device_key.clone(),
        Duration::from_millis(env.get_settings().delegation_prepare_duration),
    );

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender.clone())
        .await
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;
    let (delegation_public_key, delegation_timestamp) = env
        .get_identity()
        .decode_prepare_delegation_response(&response_data)
        .map_err(to_internal_error)?;

    let get_delegation_request = build_query_request(
        env,
        env.get_identity().build_get_delegation_request(
            &identity_number,
            hostname.clone(),
            device_key,
            delegation_timestamp,
        ),
        sender,
    )
    .await
    .map_err(to_internal_error)?;

    log_info!(
        env,
        "Delegation: prepared for host '{hostname}', principal: {}.",
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
                            timestamp: delegation_timestamp,
                            signature: None,
                        },
                    },
                },
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
