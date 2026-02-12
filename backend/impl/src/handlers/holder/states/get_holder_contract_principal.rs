use common_canister_impl::components::identity::api::{
    AuthnMethod, IdentityAuthnInfoRet, WebAuthn,
};
use common_canister_impl::handlers::build_ic_agent_request;
use contract_canister_api::types::holder::{
    CaptureProcessingEvent, CaptureState, HolderProcessingError, HolderProcessingEvent, HolderState,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{execute_ic_agent_request, get_holder_model, update_holder};
use crate::log_info;
use crate::model::holder::HolderLock;

use super::to_internal_error;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Holder contract principal: fetching ...");

    let (request_definition, sender, owner, identity_number, ecdsa_key) =
        get_holder_model(|_, model| {
            let frontend_hostname = match &model.state.value {
                HolderState::Capture {
                    sub_state: CaptureState::GetHolderContractPrincipal { frontend_hostname },
                    ..
                } => frontend_hostname,
                _ => panic!(),
            };

            (
                env.get_identity().build_get_principal_request(
                    &model.identity_number.unwrap(),
                    frontend_hostname,
                ),
                model.get_request_sender(),
                model.owner.as_ref().unwrap().value,
                model.identity_number.unwrap(),
                model.get_ecdsa_as_asn1_block_public_key(),
            )
        });

    let event = if check_authorized(env, identity_number, ecdsa_key).await? {
        let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
            .await
            .map_err(to_internal_error)?;

        let response_data = execute_ic_agent_request(env, ic_agent_request).await?;
        let holder_contract_principal = env
            .get_identity()
            .decode_get_principal_response(&response_data)
            .map_err(to_internal_error)?;

        if holder_contract_principal == owner {
            log_info!(env, "Holder contract principal: is holder owner.");

            CaptureProcessingEvent::HolderContractPrincipalIsHolderOwner
        } else {
            log_info!(
                env,
                "Holder contract principal: obtained — {}",
                holder_contract_principal.to_text()
            );

            CaptureProcessingEvent::HolderContractPrincipalObtained {
                holder_contract_principal,
            }
        }
    } else {
        log_info!(env, "Holder contract principal: not authorized.");
        CaptureProcessingEvent::GetHolderContractPrincipalUnathorized
    };

    update_holder(lock, HolderProcessingEvent::Capturing { event })?;

    Ok(ProcessingResult::Continue)
}

async fn check_authorized(
    env: &Environment,
    identity_number: u64,
    ecdsa_key: Vec<u8>,
) -> Result<bool, HolderProcessingError> {
    env.get_identity()
        .identity_authn_info(identity_number)
        .await
        .and_then(|response| match response {
            IdentityAuthnInfoRet::Ok(identity_authn_info) => Ok(identity_authn_info),
            IdentityAuthnInfoRet::Err => Err("IdentityAuthnInfoRet::Err".to_owned()),
        })
        .map(|info| {
            info.authn_methods.iter().any(|method| match method {
                AuthnMethod::WebAuthn(WebAuthn { pubkey, .. }) => {
                    pubkey.as_slice() == ecdsa_key.as_slice()
                }
                _ => false,
            })
        })
        .map_err(to_internal_error)
}
