use contract_canister_api::types::holder::{
    FetchAssetsEvent, HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::update_holder;
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Assets fetch: completed.");

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::FetchAssetsFinished,
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
