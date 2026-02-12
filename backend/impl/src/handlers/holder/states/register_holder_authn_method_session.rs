use common_canister_impl::components::identity::api::{
    AuthnMethodConfirmationCode, AuthnMethodRegisterError, AuthnMethodRegisterRet,
};
use common_canister_impl::handlers::build_ic_agent_request;
use common_canister_types::nanos_to_millis;
use contract_canister_api::types::holder::{
    CaptureError, CaptureProcessingEvent, HolderProcessingError, HolderProcessingEvent,
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
    let (identity_number, sender) =
        get_holder_model(|_, model| (model.identity_number.unwrap(), model.get_request_sender()));

    let request_definition = env
        .get_identity()
        .build_authn_method_session_register(&identity_number);

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;
    let response = env
        .get_identity()
        .decode_authn_method_session_register(&response_data)
        .map_err(to_internal_error)?;

    let event = match response {
        AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code,
            expiration,
            ..
        }) => CaptureProcessingEvent::AuthnMethodSessionRegistered {
            confirmation_code,
            expiration: nanos_to_millis(&(expiration as u128)),
        },
        AuthnMethodRegisterRet::Err(error) => match error {
            AuthnMethodRegisterError::RegistrationModeOff => {
                CaptureProcessingEvent::AuthnMethodSessionRegisterError {
                    error: CaptureError::SessionRegistrationModeOff,
                }
            }
            AuthnMethodRegisterError::RegistrationAlreadyInProgress => {
                CaptureProcessingEvent::AuthnMethodSessionRegisterError {
                    error: CaptureError::SessionRegistrationAlreadyInProgress,
                }
            }
            AuthnMethodRegisterError::InvalidMetadata(reason) => {
                CaptureProcessingEvent::AuthnMethodSessionRegisterError {
                    error: CaptureError::InvalidMetadata(reason),
                }
            }
        },
    };

    log_info!(
        env,
        "Authn method session registration: result is {event:?}."
    );

    update_holder(lock, HolderProcessingEvent::Capturing { event })?;

    Ok(ProcessingResult::Continue)
}
