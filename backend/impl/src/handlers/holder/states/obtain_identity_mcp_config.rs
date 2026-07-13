use common_canister_impl::handlers::build_ic_agent_request;
use contract_canister_api::types::holder::{
    CaptureProcessingEvent, HolderProcessingError, HolderProcessingEvent,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{
    execute_ic_agent_request, get_holder_model, to_internal_error, update_holder,
};
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Identity MCP config: obtaining ...");

    let (request_definition, sender) = get_holder_model(|_, model| {
        (
            env.get_identity()
                .build_mcp_get_config_request(&model.identity_number.unwrap()),
            model.get_request_sender(),
        )
    });

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

    let mcp_config = env
        .get_identity()
        .decode_mcp_get_config_response(&response_data)
        .map_err(to_internal_error)?;

    if !mcp_config.enabled {
        log_info!(env, "Identity MCP config: disabled, cleanup skipped.");
        update_holder(
            lock,
            HolderProcessingEvent::Capturing {
                event: CaptureProcessingEvent::IdentityMcpCleanupSkipped,
            },
        )?;
        return Ok(ProcessingResult::Continue);
    }

    log_info!(
        env,
        "Identity MCP config: enabled, revoking session grant via mcp_set_config ..."
    );

    update_holder(
        lock,
        HolderProcessingEvent::Capturing {
            event: CaptureProcessingEvent::IdentityMcpConfigObtained,
        },
    )?;

    Ok(ProcessingResult::Continue)
}
