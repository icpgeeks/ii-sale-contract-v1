use std::collections::HashMap;

use common_canister_impl::components::nns::api::{Neuron, NeuronInfo};
use common_canister_types::Timestamped;
use contract_canister_api::types::holder::{
    FetchAssetsEvent, HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent,
    NeuronAsset, NeuronId, NeuronInformation, NeuronInformationExtended,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{
    build_ic_agent_request_with_check_delegation, execute_ic_agent_request, get_holder_model,
    to_internal_error, update_holder,
};
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let neurons_ids_without_info: Vec<NeuronId> = get_holder_model(|_, model| {
        let chunk_count = if model.processing_error.is_some() {
            1
        } else {
            env.get_settings().fetch_neurons_information_chunk_count
        };

        model
            .fetching_nns_assets
            .as_ref()
            .and_then(|assets| assets.controlled_neurons.as_ref())
            .map(|neurons| {
                neurons
                    .value
                    .iter()
                    .filter(|neuron| neuron.info.is_none())
                    .map(|neuron| neuron.neuron_id)
                    .take(chunk_count)
                    .collect()
            })
            .unwrap_or_default()
    });

    let event = if neurons_ids_without_info.is_empty() {
        log_info!(env, "Neurons: all information obtained.");
        FetchAssetsEvent::NeuronsInformationObtained
    } else {
        log_info!(
            env,
            "Neurons: requesting list for IDs [{}].",
            neurons_ids_without_info
                .iter()
                .map(|id| id.to_string())
                .collect::<Vec<String>>()
                .join(", ")
        );

        let ic_agent_request = build_ic_agent_request_with_check_delegation(
            env,
            lock,
            env.get_nns()
                .build_get_list_neurons_request(neurons_ids_without_info.clone()),
            get_holder_model(|_, model| model.get_request_sender_with_delegation()),
        )
        .await
        .map_err(to_internal_error)?;

        let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

        let list_neurons = env
            .get_nns()
            .decode_get_list_neurons_response(&response_data)
            .map_err(to_internal_error)?;

        log_info!(
            env,
            "Neurons: list received (full: {}, info: {}).",
            list_neurons.full_neurons.len(),
            list_neurons.neuron_infos.len(),
        );

        if list_neurons.full_neurons.is_empty() {
            FetchAssetsEvent::NeuronsInformationGotEmpty {
                neuron_ids: neurons_ids_without_info,
            }
        } else {
            let mut neuron_infos = HashMap::new();
            for (id, neuron_info) in list_neurons.neuron_infos {
                neuron_infos.insert(id, neuron_info);
            }

            let time = env.get_time().get_current_unix_epoch_time_millis();
            let controller = get_holder_model(|_, model| model.get_delegation_controller());
            let (ctrl_neurons, hk_neurons) = list_neurons.full_neurons.iter().fold(
                (Vec::new(), Vec::new()),
                |(mut acc_ctrl_neurons, mut acc_hk_neurons), neuron| {
                    let info = NeuronAsset {
                        neuron_id: neuron.id.as_ref().unwrap().id,
                        info: Some(Timestamped::new(
                            time,
                            neuron_to_asset(neuron, &neuron_infos),
                        )),
                    };
                    if neuron.controller == controller {
                        acc_ctrl_neurons.push((info, neuron.hot_keys.clone()))
                    } else {
                        acc_hk_neurons.push(info)
                    }
                    (acc_ctrl_neurons, acc_hk_neurons)
                },
            );
            FetchAssetsEvent::NeuronsInformationGot {
                ctrl_neurons,
                hk_neurons,
            }
        }
    };

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets { event },
        },
    )?;

    check_neurons_limit(env, lock)?;

    Ok(ProcessingResult::Continue)
}

fn check_neurons_limit(env: &Environment, lock: &HolderLock) -> Result<(), HolderProcessingError> {
    let neurons_count = get_holder_model(|_, model| {
        model
            .fetching_nns_assets
            .as_ref()
            .and_then(|assets| assets.controlled_neurons.as_ref())
            .map(|neurons| neurons.value.len())
            .unwrap_or(0)
    });
    if neurons_count <= env.get_settings().max_neurons_allowed {
        return Ok(());
    }
    // check only non-zero neurons
    let non_zero_neurons_count = get_holder_model(|_, model| {
        model
            .fetching_nns_assets
            .as_ref()
            .and_then(|assets| assets.controlled_neurons.as_ref())
            .map(|neurons| {
                neurons
                    .value
                    .iter()
                    .filter(|neuron| neuron.info.is_some())
                    .count()
            })
            .unwrap_or(0)
    });
    if non_zero_neurons_count <= env.get_settings().max_neurons_allowed {
        return Ok(());
    }
    log_info!(
        env,
        "Neurons: excessive count detected — {non_zero_neurons_count}."
    );
    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::TooManyNeurons,
            },
        },
    )
}

pub(crate) fn neuron_to_asset(
    neuron: &Neuron,
    neuron_infos: &HashMap<u64, NeuronInfo>,
) -> NeuronInformation {
    let neuron_information = NeuronInformation {
        cached_neuron_stake_e8s: neuron.cached_neuron_stake_e8s,
        maturity_e8s_equivalent: neuron.maturity_e8s_equivalent,
        staked_maturity_e8s_equivalent: neuron.staked_maturity_e8s_equivalent,
        auto_stake_maturity: neuron.auto_stake_maturity,
        joined_community_fund_timestamp_seconds: neuron.joined_community_fund_timestamp_seconds,
        neuron_fees_e8s: neuron.neuron_fees_e8s,
        neuron_type: neuron.neuron_type,
        controller: neuron.controller,
        kyc_verified: neuron.kyc_verified,
        not_for_profit: neuron.not_for_profit,
        account: neuron.account.to_vec(),
        created_timestamp_seconds: neuron.created_timestamp_seconds,
        aging_since_timestamp_seconds: neuron.aging_since_timestamp_seconds,
        known_neuron_name: neuron
            .known_neuron_data
            .as_ref()
            .map(|value| value.name.clone()),
        voting_power_refreshed_timestamp_seconds: neuron.voting_power_refreshed_timestamp_seconds,
        potential_voting_power: neuron.potential_voting_power,
        deciding_voting_power: neuron.deciding_voting_power,
        visibility: neuron.visibility,
        neuron_information_extended: neuron_infos
            .get(&neuron.id.as_ref().unwrap().id)
            .map(neuron_info_to_asset),
    };
    neuron_information
}

fn neuron_info_to_asset(info: &NeuronInfo) -> NeuronInformationExtended {
    NeuronInformationExtended {
        dissolve_delay_seconds: info.dissolve_delay_seconds,
        state: info.state,
        age_seconds: info.age_seconds,
    }
}
