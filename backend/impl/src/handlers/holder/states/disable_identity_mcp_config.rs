use common_canister_impl::components::identity::api::{McpConfig, McpSetConfigRet};
use common_canister_impl::handlers::build_ic_agent_request;
use contract_canister_api::types::holder::{
    CaptureProcessingEvent, CaptureState, HolderProcessingError, HolderProcessingEvent, HolderState,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, to_internal_error, update_holder};
use crate::log_error;
use crate::log_info;
use crate::model::holder::HolderLock;

use super::execute_ic_agent_request;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state: CaptureState::DisablingIdentityMcpConfig,
            ..
        } => Ok(()),
        _ => Err(HolderProcessingError::InternalError {
            error: "Invalid holder state for disabling identity MCP config".to_owned(),
        }),
    })?;

    log_info!(
        env,
        "Disable identity MCP config and revoke session grant ..."
    );

    let disabled_config = McpConfig {
        enabled: false,
        url: None,
    };

    let (request_definition, sender) = get_holder_model(|_, model| {
        (
            env.get_identity()
                .build_mcp_set_config_request(&model.identity_number.unwrap(), &disabled_config),
            model.get_request_sender(),
        )
    });

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = match execute_ic_agent_request(env, ic_agent_request).await {
        Ok(data) => data,
        Err(err) => {
            log_error!(env, "Disable identity MCP config: ic agent error {err:?}");
            return mcp_cleanup_resync(lock);
        }
    };

    let response = env
        .get_identity()
        .decode_mcp_set_config_response(&response_data)
        .map_err(to_internal_error)?;

    match response {
        McpSetConfigRet::Ok => {
            log_info!(
                env,
                "Disable identity MCP config: disabled and grant revoked."
            );
            update_holder(
                lock,
                HolderProcessingEvent::Capturing {
                    event: CaptureProcessingEvent::IdentityMcpCleanupCompleted,
                },
            )
            .map(|_| ProcessingResult::Continue)
        }
        McpSetConfigRet::Err(error) => {
            log_error!(env, "Disable identity MCP config: error: {error}");
            mcp_cleanup_resync(lock)
        }
    }
}

fn mcp_cleanup_resync(lock: &HolderLock) -> Result<ProcessingResult, HolderProcessingError> {
    update_holder(
        lock,
        HolderProcessingEvent::Capturing {
            event: CaptureProcessingEvent::IdentityMcpCleanupResync,
        },
    )
    .map(|_| ProcessingResult::Continue)
}
