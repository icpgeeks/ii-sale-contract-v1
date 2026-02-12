use contract_canister_api::types::holder::{
    FetchAssetsEvent, HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent,
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
    let ic_agent_request = build_ic_agent_request_with_check_delegation(
        env,
        lock,
        env.get_nns().build_get_neuron_ids_request(),
        get_holder_model(|_, model| model.get_request_sender_with_delegation()),
    )
    .await?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

    let neuron_ids = env
        .get_nns()
        .decode_get_neuron_ids_response(&response_data)
        .map_err(to_internal_error)?;

    log_info!(env, "Neurons: received IDs — {neuron_ids:?}");

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::NeuronsIdsGot { neuron_ids },
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
