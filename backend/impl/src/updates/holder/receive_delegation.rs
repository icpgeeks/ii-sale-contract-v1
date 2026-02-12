#[cfg(network = "local")]
use crate::handlers::holder::states::execute_ic_agent_request;
use crate::{
    components::Environment,
    handlers::holder::{processor::update_holder_with_lock, states::get_holder_model},
    log_info,
    model::holder::UpdateHolderError,
};

use common_canister_impl::components::identity::api::{GetDelegationResponse, SignedDelegation};
#[cfg(network = "local")]
use common_canister_impl::handlers::ic_agent::{IcAgentRequest, QueryHttpSettings};
use common_canister_types::TimestampNanos;
use contract_canister_api::{
    receive_delegation::*,
    types::holder::{
        DelegationData, DelegationState, FetchAssetsEvent, FetchAssetsState, HolderProcessingEvent,
        HolderState, HoldingProcessingEvent, HoldingState, ObtainDelegationEvent,
    },
};
use ic_cdk_macros::update;
use ic_signature_verification::verify_canister_sig;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn receive_delegation(
    Args {
        get_delegation_response,
    }: Args,
) -> Response {
    receive_delegation_int(get_delegation_response).await.into()
}

pub(crate) async fn receive_delegation_int(
    get_delegation_response: Vec<u8>,
) -> Result<ReceiveDelegationResult, ReceiveDelegationError> {
    let env = get_env();

    #[cfg(network = "local")]
    let get_delegation_response = tmp(env.as_ref(), &get_delegation_response).await?;

    let get_delegation_response = env
        .get_identity()
        .decode_get_delegation_response(&get_delegation_response)
        .unwrap();

    let signed_delegation = match get_delegation_response {
        GetDelegationResponse::NoSuchDelegation => {
            return Err(ReceiveDelegationError::ResponseNotContainsDelegation);
        }
        GetDelegationResponse::SignedDelegation(signed_delegation) => signed_delegation,
    };

    let delegation_data = verify_delegation(env.as_ref(), &signed_delegation)?;

    log_info!(env, "Delegation: response receiving...");

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::FetchAssets {
            event: FetchAssetsEvent::ObtainDelegation {
                event: ObtainDelegationEvent::DelegationGot { delegation_data },
            },
        },
    })
    .map(|_| ReceiveDelegationResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => ReceiveDelegationError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => ReceiveDelegationError::HolderLocked {
            lock: env.get_time().get_delayed_time_millis(expiration),
        },
    })
}

fn verify_delegation(
    env: &Environment,
    signed_delegation: &SignedDelegation,
) -> Result<DelegationData, ReceiveDelegationError> {
    let (delegation_data, ecdsa_key) = get_holder_model(|_, model| match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::FetchAssets {
                    fetch_assets_state:
                        FetchAssetsState::ObtainDelegationState {
                            sub_state:
                                DelegationState::GetDelegationWaiting {
                                    delegation_data, ..
                                },
                            ..
                        },
                    ..
                },
        } => Ok((
            delegation_data.clone(),
            model.get_ecdsa_as_asn1_block_public_key(),
        )),
        _ => Err(ReceiveDelegationError::HolderWrongState),
    })?;

    if delegation_data.timestamp != signed_delegation.delegation.expiration as TimestampNanos {
        return Err(ReceiveDelegationError::DelegationWrong {
            reason: "prepared expiration not equals delegation expiration".to_string(),
        });
    }

    if ecdsa_key != signed_delegation.delegation.pubkey.as_slice() {
        return Err(ReceiveDelegationError::DelegationWrong {
            reason: "prepared public key not equals delegation pub_key".to_string(),
        });
    }

    let msg = env.get_identity().get_delegation_signature_msg(
        ecdsa_key.as_slice(),
        signed_delegation.delegation.expiration,
        None,
    );

    verify_canister_sig(
        &msg,
        signed_delegation.signature.as_slice(),
        delegation_data.public_key.as_slice(),
        env.get_ic().get_root_public_key_raw(),
    )
    .map_err(|reason| ReceiveDelegationError::DelegationWrong { reason })?;

    Ok(DelegationData {
        signature: Some(signed_delegation.signature.to_vec()),
        ..delegation_data
    })
}

#[cfg(network = "local")]
async fn tmp(env: &Environment, data: &[u8]) -> Result<Vec<u8>, ReceiveDelegationError> {
    if !data.is_empty() {
        return Ok(data.to_vec());
    }

    let get_delegation_request = get_holder_model(|_, model| match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::FetchAssets {
                    fetch_assets_state:
                        FetchAssetsState::ObtainDelegationState {
                            sub_state:
                                DelegationState::GetDelegationWaiting {
                                    get_delegation_request,
                                    ..
                                },
                            ..
                        },
                    ..
                },
        } => Ok(get_delegation_request.clone()),
        _ => Err(ReceiveDelegationError::HolderWrongState),
    })?;

    let ic_agent_request = IcAgentRequest::Query {
        signed_query_request: get_delegation_request.clone(),
        settings: QueryHttpSettings::default(),
    };

    execute_ic_agent_request(env, ic_agent_request)
        .await
        .map_err(|reason| ReceiveDelegationError::DelegationWrong {
            reason: format!("{reason:?}"),
        })
}
