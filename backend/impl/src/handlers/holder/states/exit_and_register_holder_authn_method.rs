use common_canister_impl::components::identity::api::{
    AuthnMethod, AuthnMethodData, AuthnMethodProtection, AuthnMethodPurpose,
    AuthnMethodRegistrationModeExitError, AuthnMethodSecuritySettings, MetadataMapV2,
    MetadataMapV2Item1, WebAuthn,
};
use common_canister_impl::handlers::build_ic_agent_request;
use contract_canister_api::types::holder::{
    CaptureError, CaptureProcessingEvent, HolderProcessingError, HolderProcessingEvent,
};
use serde_bytes::ByteBuf;

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
    log_info!(env, "Exit and register holder authn method: started ...");

    let (identity_number, ecdsa_pubkey, sender) = get_holder_model(|_, model| {
        (
            model.identity_number.unwrap(),
            model.get_ecdsa_as_asn1_block_public_key(),
            model.get_request_sender(),
        )
    });

    let alias = env.get_ic().get_canister().to_text().to_string();
    let authn_method_data = AuthnMethodData {
        security_settings: AuthnMethodSecuritySettings {
            protection: AuthnMethodProtection::Unprotected,
            purpose: AuthnMethodPurpose::Authentication,
        },
        last_authentication: None,
        authn_method: AuthnMethod::WebAuthn(WebAuthn {
            pubkey: ByteBuf::from(ecdsa_pubkey),
            credential_id: ByteBuf::from(alias.clone().as_bytes().to_vec()),
        }),
        metadata: Box::new(MetadataMapV2(vec![(
            "alias".to_owned(),
            MetadataMapV2Item1::String(alias),
        )])),
    };

    let request_definition = env
        .get_identity()
        .build_authn_method_registration_mode_exit_request(
            &identity_number,
            &Some(authn_method_data),
        );

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;
    let response = env
        .get_identity()
        .decode_authn_method_registration_mode_exit_response(&response_data)
        .map_err(to_internal_error)?;

    let event = match response {
        Ok(_) => CaptureProcessingEvent::HolderAuthnMethodRegistered,
        Err(error) => match error {
            AuthnMethodRegistrationModeExitError::Unauthorized(..) => {
                CaptureProcessingEvent::HolderAuthnMethodRegisterError {
                    error: CaptureError::HolderAuthnMethodRegistrationUnauthorized,
                }
            }
            AuthnMethodRegistrationModeExitError::InternalCanisterError(error) => {
                return Err(HolderProcessingError::InternalError { error });
            }
            AuthnMethodRegistrationModeExitError::RegistrationModeOff => {
                CaptureProcessingEvent::HolderAuthnMethodRegisterError {
                    error: CaptureError::HolderAuthnMethodRegistrationModeOff,
                }
            }
            AuthnMethodRegistrationModeExitError::InvalidMetadata(str) => {
                CaptureProcessingEvent::HolderAuthnMethodRegisterError {
                    error: CaptureError::InvalidMetadata(str),
                }
            }
        },
    };

    log_info!(
        env,
        "Exit and register holder authn method: result is {event:?}."
    );

    update_holder(lock, HolderProcessingEvent::Capturing { event })?;

    Ok(ProcessingResult::Continue)
}
