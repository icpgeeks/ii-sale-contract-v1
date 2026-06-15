use contract_canister_api::types::holder::{
    FetchAssetsEvent, FetchAssetsState, FetchIdentityAccountsNnsAssetsState, FetchNnsAssetsState,
    HolderProcessingError, HolderProcessingEvent, HolderState, HoldingProcessingEvent,
    HoldingState,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{
    build_ic_agent_request_with_check_delegation, execute_ic_agent_request, get_holder_model,
    to_internal_error, update_holder,
};
use crate::model::holder::HolderLock;
use crate::{log_error, log_info};

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let (neuron_id, hot_key) = get_holder_model(|_, model| {
        if let HolderState::Holding {
            sub_state:
                HoldingState::FetchAssets {
                    fetch_assets_state:
                        FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                            sub_state:
                                FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                                    sub_state:
                                        FetchNnsAssetsState::VerifyingNeuronHotkeyDeletion {
                                            neuron_id,
                                            hot_key,
                                            ..
                                        },
                                    ..
                                },
                        },
                    ..
                },
        } = &model.state.value
        {
            Ok((*neuron_id, *hot_key))
        } else {
            Err("Invalid state for verifying neuron hot key deletion".to_string())
        }
    })
    .map_err(|error| HolderProcessingError::InternalError { error })?;

    log_info!(
        env,
        "Neuron {neuron_id}: verifying hot key '{}' removal via list_neurons ...",
        hot_key.to_text()
    );

    let ic_agent_request = build_ic_agent_request_with_check_delegation(
        env,
        lock,
        env.get_nns()
            .build_get_list_neurons_request(vec![neuron_id]),
        get_holder_model(|_, model| model.get_request_sender_with_delegation()),
    )
    .await?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

    let list_neurons = env
        .get_nns()
        .decode_get_list_neurons_response(&response_data)
        .map_err(to_internal_error)?;

    let hot_key_still_present = list_neurons.full_neurons.iter().any(|neuron| {
        neuron.id.as_ref().map(|id| id.id) == Some(neuron_id) && neuron.hot_keys.contains(&hot_key)
    });

    if hot_key_still_present {
        log_error!(
            env,
            "Neuron {neuron_id}: hot key '{}' is still present after RemoveHotKey failure.",
            hot_key.to_text()
        );

        update_holder(
            lock,
            HolderProcessingEvent::Holding {
                event: HoldingProcessingEvent::FetchAssets {
                    event: FetchAssetsEvent::NeuronHotkeyVerifiedPresent { neuron_id, hot_key },
                },
            },
        )?;

        return Err(HolderProcessingError::IcAgentError {
            error: format!(
                "Neuron {neuron_id}: hot key '{}' is still present after RemoveHotKey failure",
                hot_key.to_text()
            ),
            retry_delay: None,
        });
    }

    log_info!(
        env,
        "Neuron {neuron_id}: hot key '{}' verified absent.",
        hot_key.to_text()
    );

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::NeuronHotkeyVerifiedAbsent { neuron_id, hot_key },
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
