use contract_canister_api::types::holder::{
    CaptureProcessingEvent, HolderProcessingError, HolderProcessingEvent,
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
    log_info!(
        env,
        "Legacy MCP config lookup state: bypassing query and revoking access unconditionally ..."
    );

    // This processor is retained only so holders persisted in the legacy state can progress.
    // The legacy event moves them to the unconditional mcp_set_config update.
    update_holder(
        lock,
        HolderProcessingEvent::Capturing {
            event: CaptureProcessingEvent::IdentityMcpConfigObtained,
        },
    )?;

    Ok(ProcessingResult::Continue)
}
