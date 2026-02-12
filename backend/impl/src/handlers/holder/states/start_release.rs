use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, ReleaseProcessingEvent,
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
    log_info!(env, "Release: started ...");

    update_holder(
        lock,
        HolderProcessingEvent::Releasing {
            event: ReleaseProcessingEvent::ReleaseStarted,
        },
    )?;

    Ok(ProcessingResult::Continue)
}
