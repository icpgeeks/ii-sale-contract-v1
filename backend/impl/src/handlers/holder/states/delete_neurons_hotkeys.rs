use common_canister_impl::components::nns::api::{
    Command1, Configure, ManageNeuronCommandRequest, ManageNeuronRequest, NeuronId, Operation,
    RemoveHotKey,
};
use contract_canister_api::types::holder::{
    FetchAssetsEvent, FetchAssetsState, FetchNnsAssetsState, HolderProcessingError,
    HolderProcessingEvent, HolderState, HoldingProcessingEvent, HoldingState,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{
    build_ic_agent_request_with_check_delegation, execute_ic_agent_request, get_holder_model,
    update_holder,
};
use crate::model::holder::HolderLock;
use crate::{log_error, log_info};

use super::to_internal_error;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let hotkey_candidate = get_holder_model(|_, model| {
        if let HolderState::Holding {
            sub_state:
                HoldingState::FetchAssets {
                    fetch_assets_state:
                        FetchAssetsState::FetchNnsAssetsState {
                            sub_state:
                                FetchNnsAssetsState::DeletingNeuronsHotkeys { neuron_hotkeys },
                        },
                    ..
                },
        } = &model.state.value
        {
            Ok(neuron_hotkeys
                .first()
                .map(|(neuron_id, hot_key)| (*neuron_id, *hot_key.first().unwrap())))
        } else {
            Err("Invalid state for deleting neuron hot keys".to_string())
        }
    })
    .map_err(|error| HolderProcessingError::InternalError { error })?;
    match hotkey_candidate {
        None => {
            log_info!(env, "Neurons: no more hot keys to delete.");
            update_holder(
                lock,
                HolderProcessingEvent::Holding {
                    event: HoldingProcessingEvent::FetchAssets {
                        event: FetchAssetsEvent::AllNeuronsHotkeysDeleted,
                    },
                },
            )?;
        }
        Some((neuron_id, hot_key)) => {
            let ic_agent_request = build_ic_agent_request_with_check_delegation(
                env,
                lock,
                env.get_nns()
                    .build_manage_neuron_request(ManageNeuronRequest {
                        id: Some(NeuronId { id: neuron_id }),
                        command: Some(ManageNeuronCommandRequest::Configure(Configure {
                            operation: Some(Operation::RemoveHotKey(RemoveHotKey {
                                hot_key_to_remove: Some(hot_key),
                            })),
                        })),
                    }),
                get_holder_model(|_, model| model.get_request_sender_with_delegation()),
            )
            .await?;

            let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

            let response = env
                .get_nns()
                .decode_manage_neuron_response(&response_data)
                .map_err(to_internal_error)?;

            let event = match response.command {
                Some(Command1::Configure {}) => {
                    log_info!(
                        env,
                        "Neuron {neuron_id}: hot key '{}' deleted.",
                        hot_key.to_text()
                    );

                    FetchAssetsEvent::NeuronHotkeyDeleted {
                        neuron_id,
                        hot_key,
                        failed: None,
                    }
                }
                other => {
                    log_error!(
                        env,
                        "Neuron {neuron_id}: failed to delete hot key '{}', reason: {other:?}",
                        hot_key.to_text()
                    );

                    FetchAssetsEvent::NeuronHotkeyDeleted {
                        neuron_id,
                        hot_key,
                        failed: Some(format!("{other:?}")),
                    }
                }
            };

            update_holder(
                lock,
                HolderProcessingEvent::Holding {
                    event: HoldingProcessingEvent::FetchAssets { event },
                },
            )?;
        }
    }

    Ok(ProcessingResult::Continue)
}
