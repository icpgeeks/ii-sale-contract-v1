use contract_canister_api::types::holder::{
    CheckAssetsEvent, HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent,
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
    log_info!(env, "Assets check: completed.");

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::CheckAssets {
                event: CheckAssetsEvent::CheckAssetsFinished,
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
