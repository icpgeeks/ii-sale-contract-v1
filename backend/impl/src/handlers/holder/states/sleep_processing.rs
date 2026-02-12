use contract_canister_api::types::holder::HolderProcessingError;

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    _lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let now = env.get_time().get_current_unix_epoch_time_millis();

    Ok(ProcessingResult::Schedule {
        scheduled_time: now + 365 * 24 * 3600 * 1000,
    })
}
