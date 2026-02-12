use common_canister_impl::components::identity::api::{
    AuthnMethod, AuthnMethodRemoveRet, IdentityAuthnInfoRet, WebAuthn,
};
use common_canister_impl::handlers::build_ic_agent_request;
use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, ReleaseProcessingEvent,
};
use serde_bytes::ByteBuf;

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, to_internal_error, update_holder};
use crate::model::holder::HolderLock;
use crate::{log_error, log_info};

use super::{execute_ic_agent_request, to_ic_agent_error};

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let (identity_number, sender, ecdsa_key) = get_holder_model(|_, model| {
        (
            model.identity_number.unwrap(),
            model.get_request_sender(),
            model.get_ecdsa_as_asn1_block_public_key(),
        )
    });

    let identity_authn_info = env
        .get_identity()
        .identity_authn_info(identity_number)
        .await
        .and_then(|response| match response {
            IdentityAuthnInfoRet::Ok(identity_authn_info) => Ok(identity_authn_info),
            IdentityAuthnInfoRet::Err => Err("IdentityAuthnInfoRet::Err".to_owned()),
        })
        .map_err(to_ic_agent_error)?;

    let is_ecdsa_key = identity_authn_info
        .authn_methods
        .iter()
        .any(|method| match method {
            AuthnMethod::WebAuthn(WebAuthn { pubkey, .. }) => {
                pubkey.as_slice() == ecdsa_key.as_slice()
            }
            _ => false,
        });

    if !is_ecdsa_key {
        log_info!(env, "Holder device: not found.");

        update_holder(
            lock,
            HolderProcessingEvent::Releasing {
                event: ReleaseProcessingEvent::HolderAuthnMethodNotFound,
            },
        )?;
    } else if identity_authn_info.authn_methods.len() == 1 {
        log_error!(
            env,
            "Holder authn method deletion: failed, new owner authn method not found.",
        );

        update_holder(
            lock,
            HolderProcessingEvent::Releasing {
                event:
                    ReleaseProcessingEvent::HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered,
            },
        )?;
    } else {
        let request_definition = env
            .get_identity()
            .build_authn_method_remove_request(&identity_number, &ByteBuf::from(ecdsa_key));

        let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
            .await
            .map_err(to_internal_error)?;

        let response_data = execute_ic_agent_request(env, ic_agent_request).await?;
        env.get_identity()
            .decode_authn_method_remove_response(&response_data)
            .and_then(|response| match response {
                AuthnMethodRemoveRet::Ok => Ok(()),
                AuthnMethodRemoveRet::Err => Err("AuthnMethodRemoveRet::Err".to_owned()),
            })
            .map_err(to_internal_error)?;

        log_info!(env, "Holder device: deleted.");

        update_holder(
            lock,
            HolderProcessingEvent::Releasing {
                event: ReleaseProcessingEvent::HolderAuthnMethodDeleted,
            },
        )?;
    }

    Ok(ProcessingResult::Continue)
}
