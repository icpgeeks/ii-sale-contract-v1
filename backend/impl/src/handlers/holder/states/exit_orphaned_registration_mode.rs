use common_canister_impl::components::identity::api::AuthnMethodRegistrationModeExitError;
use common_canister_impl::handlers::build_ic_agent_request;
use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, ReleaseProcessingEvent,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, to_internal_error, update_holder};
use crate::log_info;
use crate::model::holder::HolderLock;

use super::execute_ic_agent_request;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Orphaned authn method registration mode: exiting ...");

    let (request_definition, sender) = get_holder_model(|_, model| {
        (
            env.get_identity()
                .build_authn_method_registration_mode_exit_request(
                    &model.identity_number.unwrap(),
                    &None,
                ),
            model.get_request_sender(),
        )
    });

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;
    let response = env
        .get_identity()
        .decode_authn_method_registration_mode_exit_response(&response_data)
        .map_err(to_internal_error)?;

    let event = match response {
        Ok(_) => {
            log_info!(env, "Orphaned authn method registration mode: exited.");
            ReleaseProcessingEvent::OrphanedAuthnRegistrationModeExited
        }
        Err(err) => match err {
            AuthnMethodRegistrationModeExitError::Unauthorized(_) => {
                log_info!(env, "Orphaned authn method registration mode: unauthorized, user removed contract pubkey on his own.");
                ReleaseProcessingEvent::OrphanedAuthnRegistrationModeUnauthorized
            }
            AuthnMethodRegistrationModeExitError::RegistrationModeOff => {
                log_info!(env, "Orphaned authn method registration mode: absent.");
                ReleaseProcessingEvent::OrphanedAuthnRegistrationModeExited
            }
            other_err => {
                log_info!(
                    env,
                    "Orphaned authn method registration mode: exit failed: {other_err:?}"
                );
                // skip error
                ReleaseProcessingEvent::OrphanedAuthnRegistrationModeExited
            }
        },
    };

    update_holder(lock, HolderProcessingEvent::Releasing { event })?;
    Ok(ProcessingResult::Continue)
}
