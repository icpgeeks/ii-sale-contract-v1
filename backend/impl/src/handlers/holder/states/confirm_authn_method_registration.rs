use common_canister_impl::components::identity::api::{
    AuthnMethodConfirmRet, AuthnMethodConfirmationError,
};
use common_canister_impl::handlers::build_ic_agent_request;
use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HolderState, ReleaseProcessingEvent, ReleaseState,
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
    log_info!(env, "Authn method registration mode: confirming ...");

    let (request_definition, sender, verification_code) = get_holder_model(|_, model| {
        let verification_code = match &model.state.value {
            HolderState::Release {
                sub_state:
                    ReleaseState::ConfirmAuthnMethodRegistration {
                        verification_code, ..
                    },
                ..
            } => verification_code,
            _ => panic!(),
        };

        (
            env.get_identity().build_authn_method_confirm_request(
                &model.identity_number.unwrap(),
                verification_code.clone(),
            ),
            model.get_request_sender(),
            verification_code.clone(),
        )
    });

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;
    let confirm_response = env
        .get_identity()
        .decode_authn_method_confirm_response(&response_data)
        .map_err(to_internal_error)?;

    let event = match confirm_response {
        AuthnMethodConfirmRet::Ok => ReleaseProcessingEvent::AuthnMethodRegistrationConfirmed,
        AuthnMethodConfirmRet::Err(error) => match error {
            AuthnMethodConfirmationError::RegistrationModeOff => {
                ReleaseProcessingEvent::AuthnMethodRegistrationModeOff
            }
            AuthnMethodConfirmationError::NoAuthnMethodToConfirm => {
                ReleaseProcessingEvent::AuthnMethodRegistrationNotRegistered
            }
            AuthnMethodConfirmationError::InternalCanisterError(error) => {
                return Err(HolderProcessingError::InternalError { error });
            }
            AuthnMethodConfirmationError::Unauthorized(principal) => {
                // This should not happen, as we are using holder's identity to confirm.
                return Err(HolderProcessingError::InternalError {
                    error: format!(
                        "Authn method confirmation unauthorized for principal {}",
                        principal
                    ),
                });
            }
            AuthnMethodConfirmationError::WrongCode { retries_left } => {
                ReleaseProcessingEvent::AuthnMethodRegistrationWrongCode {
                    verification_code,
                    retries_left,
                }
            }
        },
    };

    log_info!(
        env,
        "Authn method registration mode: confirm result: {event:?}"
    );

    update_holder(lock, HolderProcessingEvent::Releasing { event })?;

    Ok(ProcessingResult::Continue)
}
