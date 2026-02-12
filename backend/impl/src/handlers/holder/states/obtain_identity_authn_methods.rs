use std::ops::Deref;

use candid::IDLArgs;
use common_canister_impl::components::identity::api::{
    AuthnMethod, AuthnMethodProtection, IdentityInfoError, IdentityInfoRet, MetadataMapV2,
    MetadataMapV2Item1, PublicKeyAuthn, WebAuthn,
};

use common_canister_impl::handlers::build_ic_agent_request;
use common_canister_types::components::identity::OpenIdCredentialKey;
use contract_canister_api::types::holder::{
    CaptureProcessingEvent, HolderProcessingError, HolderProcessingEvent,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{
    get_holder_model, to_ic_agent_error, to_internal_error, update_holder,
};
use crate::model::holder::HolderLock;
use crate::{log_error, log_info};

use super::execute_ic_agent_request;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Identity authn methods: obtaining ...");

    let (request_definition, sender, ecdsa_key) = get_holder_model(|_, model| {
        let ecdsa_key = model.get_ecdsa_as_asn1_block_public_key();
        (
            env.get_identity()
                .build_identity_info_request(&model.identity_number.unwrap()),
            model.get_request_sender(),
            ecdsa_key,
        )
    });

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .inspect_err(|err| log_info!(env, "Error building IC agent request: {err:?}"))
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;
    let identity_info_response = env
        .get_identity()
        .decode_identity_info_response(&response_data)
        .map_err(to_internal_error)?;

    let mut identity_info = match identity_info_response {
        IdentityInfoRet::Ok(identity_info) => {
            // check correct deserialized openid_credentials from identity info
            if identity_info.openid_credentials.is_none()
                && is_openid_credentials_present(&response_data)?
            {
                log_error!(
                    env,
                    "Identity authn methods: detected identity API change - missing openid_credentials",
                );
                update_holder(
                    lock,
                    HolderProcessingEvent::Capturing {
                        event: CaptureProcessingEvent::IdentityAPIChangeDetected,
                    },
                )?;
                return Ok(ProcessingResult::Continue);
            }
            identity_info
        }
        IdentityInfoRet::Err(error) => match error {
            IdentityInfoError::InternalCanisterError(error) => {
                return Err(to_ic_agent_error(error));
            }
            IdentityInfoError::Unauthorized(..) => {
                return holder_authn_method_lost(env, lock);
            }
        },
    };

    let mut is_contract_key = false;
    let mut authn_pubkeys = Vec::new();
    for authn_method in identity_info.authn_methods.drain(..) {
        let pubkey = match authn_method.authn_method {
            AuthnMethod::PubKey(PublicKeyAuthn { pubkey }) => pubkey,
            AuthnMethod::WebAuthn(WebAuthn { pubkey, .. }) => pubkey,
        };

        if pubkey == ecdsa_key {
            is_contract_key = true;
            continue;
        }

        if AuthnMethodProtection::Protected == authn_method.security_settings.protection {
            return authn_method_protected_found(env, lock, pubkey, *identity_info.metadata);
        }

        authn_pubkeys.push(pubkey.to_vec());
    }

    if !is_contract_key {
        return holder_authn_method_lost(env, lock);
    }

    log_info!(
        env,
        "Identity authn methods: auth_pubkeys({}): {:?}",
        authn_pubkeys.len(),
        authn_pubkeys.iter().map(hex::encode).collect::<Vec<_>>()
    );
    log_info!(
        env,
        "Identity authn methods: active registrations: {:?}",
        identity_info
            .authn_method_registration
            .as_ref()
            .map(|reg| reg.expiration)
    );
    log_info!(
        env,
        "Identity authn methods: openid credentials({}): {:?}",
        identity_info
            .openid_credentials
            .as_ref()
            .map(|creds| creds.len())
            .unwrap_or_default(),
        identity_info.openid_credentials.as_ref().map(|creds| {
            creds
                .iter()
                .map(|cred| OpenIdCredentialKey(cred.iss.clone(), cred.sub.clone()))
                .collect::<Vec<_>>()
        })
    );

    if authn_pubkeys.is_empty()
        && identity_info.authn_method_registration.is_none()
        && identity_info
            .openid_credentials
            .as_ref()
            .filter(|creds| !creds.is_empty())
            .is_none()
    {
        // ALL AUTHN METHODS and OPENID CREDENTIALS and METHOD REGISTRATION DELETED
        log_info!(env, "All identity authn methods deleted!");

        update_holder(
            lock,
            HolderProcessingEvent::Capturing {
                event: CaptureProcessingEvent::IdentityAuthnMethodsDeleted {
                    identity_name: identity_info.name.clone(),
                },
            },
        )?
    } else {
        update_holder(
            lock,
            HolderProcessingEvent::Capturing {
                event: CaptureProcessingEvent::IdentityAuthnMethodsObtained {
                    authn_pubkeys,
                    active_registration: identity_info.authn_method_registration.is_some(),
                    openid_credentials: identity_info.openid_credentials.map(|v| {
                        v.into_iter()
                            .map(|cred| OpenIdCredentialKey(cred.iss, cred.sub))
                            .collect()
                    }),
                },
            },
        )?;
    }

    Ok(ProcessingResult::Continue)
}

fn authn_method_protected_found(
    env: &Environment,
    lock: &HolderLock,
    pubkey: serde_bytes::ByteBuf,
    meta_data: MetadataMapV2,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Find protected identity authn method: {pubkey:?}");

    update_holder(
        lock,
        HolderProcessingEvent::Capturing {
            event: CaptureProcessingEvent::IdentityAuthnMethodProtected {
                public_key: pubkey.to_vec(),
                meta_data: convert_meta_data(meta_data),
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}

fn convert_meta_data(metadata: MetadataMapV2) -> Vec<(String, String)> {
    metadata
        .0
        .iter()
        .map(|(k, v)| {
            (
                k.clone(),
                match v {
                    MetadataMapV2Item1::String(str) => str.clone(),
                    _ => format!("{v:?}"),
                },
            )
        })
        .collect()
}

fn holder_authn_method_lost(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Holder authn method lost :(");

    update_holder(
        lock,
        HolderProcessingEvent::Capturing {
            event: CaptureProcessingEvent::HolderAuthnMethodLost,
        },
    )?;

    Ok(ProcessingResult::Continue)
}

pub(crate) fn is_openid_credentials_present(
    response_data: &[u8],
) -> Result<bool, HolderProcessingError> {
    let args = IDLArgs::from_bytes(response_data).map_err(to_internal_error)?;
    if args.args.is_empty() {
        return Ok(false);
    }

    if let candid::IDLValue::Variant(ret) = args.args.first().unwrap() {
        let value = &ret.0.val;
        if let candid::IDLValue::Record(info) = value {
            let openid_credentials_field =
                candid::types::Label::Named("openid_credentials".to_string()).get_id();

            for field in info {
                if field.id.get_id() == openid_credentials_field {
                    return Ok(if let candid::IDLValue::Opt(list) = &field.val {
                        if let candid::IDLValue::Vec(v) = list.deref() {
                            !v.is_empty()
                        } else {
                            false
                        }
                    } else {
                        false
                    });
                }
            }
        }
    }
    Ok(false)
}
