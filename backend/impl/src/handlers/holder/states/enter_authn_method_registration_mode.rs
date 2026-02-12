use common_canister_impl::components::identity::api::{
    AuthnMethodRegistrationModeEnterError, AuthnMethodRegistrationModeEnterRet,
};
use common_canister_impl::handlers::build_ic_agent_request;
use common_canister_impl::handlers::ic_request::builder::BuildRequestEnvironment;
use common_canister_types::nanos_to_millis;
use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HolderState, ReleaseError,
    ReleaseProcessingEvent, ReleaseState,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{
    get_holder_model, to_ic_agent_error, to_internal_error, update_holder,
};
use crate::log_info;
use crate::model::holder::HolderLock;

use super::execute_ic_agent_request;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let (identity_number, registration_id, sender) = get_holder_model(|_, model| {
        let registration_id = match &model.state.value {
            HolderState::Release {
                sub_state: ReleaseState::EnterAuthnMethodRegistrationMode { registration_id },
                ..
            } => registration_id,
            _ => panic!(),
        };
        (
            model.identity_number.unwrap(),
            registration_id.clone(),
            model.get_request_sender(),
        )
    });

    let registration_id = match registration_id {
        Some(id) => id,
        None => generate_random_registration_id(env).await?,
    };

    let request_definition = env
        .get_identity()
        .build_authn_method_registration_mode_enter_request(
            &identity_number,
            &Some(registration_id.clone()),
        );

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;
    let response = env
        .get_identity()
        .decode_authn_method_registration_mode_enter_response(&response_data)
        .map_err(to_internal_error)?;

    let event = match response {
        AuthnMethodRegistrationModeEnterRet::Ok { expiration } => {
            ReleaseProcessingEvent::AuthnMethodRegistrationModeEntered {
                expiration: nanos_to_millis(&(expiration as u128)),
                registration_id,
            }
        }
        AuthnMethodRegistrationModeEnterRet::Err(err) => match err {
            AuthnMethodRegistrationModeEnterError::Unauthorized(_) => {
                ReleaseProcessingEvent::AuthnMethodRegistrationModeEnterUnathorized
            }
            AuthnMethodRegistrationModeEnterError::AlreadyInProgress => {
                ReleaseProcessingEvent::AuthnMethodRegistrationModeEnterFail {
                    error: ReleaseError::AuthnMethodRegistrationModeEnterAlreadyInProgress,
                }
            }
            AuthnMethodRegistrationModeEnterError::InvalidRegistrationId(error) => {
                ReleaseProcessingEvent::AuthnMethodRegistrationModeEnterFail {
                    error: ReleaseError::AuthnMethodRegistrationModeEnterInvalidRegistrationId {
                        error,
                    },
                }
            }
            _ => {
                return Err(to_ic_agent_error(format!(
                    "Receive: AuthnMethodRegistrationModeEnterRet::Err {err:?}"
                )));
            }
        },
    };

    log_info!(
        env,
        "Authn method registration mode: result event is {event:?}"
    );

    update_holder(lock, HolderProcessingEvent::Releasing { event })?;
    Ok(ProcessingResult::Continue)
}

async fn generate_random_registration_id(
    env: &Environment,
) -> Result<String, HolderProcessingError> {
    let random = env
        .get_rand_generator()
        .generate_32()
        .await
        .map_err(to_internal_error)?;

    Ok(generate_random_string(
        5,
        random,
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ))
}

pub(crate) fn generate_random_string(
    chars_count: usize,
    random: Vec<u8>,
    dictionary: &str,
) -> String {
    assert!(chars_count <= random.len());

    let dictionary: Vec<char> = dictionary.chars().collect();
    let dictionary_len = dictionary.len();

    let mut registration_id = Vec::with_capacity(chars_count);

    for i in 0..chars_count {
        let r = *random.get(i).unwrap() as usize;
        let value = dictionary.get(r % dictionary_len).unwrap();
        registration_id.push(value);
    }

    registration_id.into_iter().collect()
}
