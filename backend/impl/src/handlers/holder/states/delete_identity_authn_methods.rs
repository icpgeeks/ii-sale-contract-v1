use common_canister_impl::components::identity::api::{
    AuthnMethodRegistrationModeExitRet, AuthnMethodRemoveRet, OpenIdCredentialRemoveError,
    OpenidCredentialRemoveRet, PublicKey,
};
use common_canister_impl::handlers::build_ic_agent_request;
use common_canister_types::components::identity::OpenIdCredentialKey;
use contract_canister_api::types::holder::{
    CaptureProcessingEvent, CaptureState, HolderProcessingError, HolderProcessingEvent, HolderState,
};
use serde_bytes::ByteBuf;

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
    log_info!(env, "Identity authn methods: deleting ...");

    let (mut pubkey_supplier, openid_credential_supplier, active_registration) =
        get_holder_model(|_, model| match &model.state.value {
            HolderState::Capture {
                sub_state:
                    CaptureState::DeletingIdentityAuthnMethods {
                        authn_pubkeys,
                        active_registration,
                        openid_credentials,
                    },
                ..
            } => {
                let mut authn_pubkeys = authn_pubkeys.clone();
                let openid_credentials = openid_credentials.clone();
                Ok((
                    move || authn_pubkeys.pop(),
                    move || openid_credentials.and_then(|mut creds| creds.pop()),
                    *active_registration,
                ))
            }
            _ => Err(HolderProcessingError::InternalError {
                error: "Invalid holder state for deleting identity authn methods".to_owned(),
            }),
        })?;

    if let Some(pubkey) = pubkey_supplier() {
        delete_identity_authn_method(env, lock, &ByteBuf::from(pubkey)).await?;
    } else if let Some(credential) = openid_credential_supplier() {
        delete_openid_credential(env, lock, &credential).await?;
    } else if active_registration {
        exit_authn_method_registration(env, lock).await?;
    } else {
        // ALL AUTHN METHODS and OPENID CREDENTIALS and METHOD REGISTRATION DELETED in this chunk, we should reevaluate state of identity by obtaining full identity info again
        log_info!(env, "Identity authn methods: partially deleted");

        update_holder(
            lock,
            HolderProcessingEvent::Capturing {
                event: CaptureProcessingEvent::IdentityAuthnMethodsPartiallyDeleted,
            },
        )?;
    };

    Ok(ProcessingResult::Continue)
}

async fn delete_identity_authn_method(
    env: &Environment,
    lock: &HolderLock,
    pubkey: &PublicKey,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Delete identity authn method: {pubkey:?} ...");

    let (request_definition, sender) = get_holder_model(|_, model| {
        (
            env.get_identity()
                .build_authn_method_remove_request(&model.identity_number.unwrap(), pubkey),
            model.get_request_sender(),
        )
    });

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = match execute_ic_agent_request(env, ic_agent_request).await {
        Ok(data) => data,
        Err(err) => {
            log_error!(env, "Delete identity authn method: ic agent error {err:?}");
            return identity_authn_methods_resync(lock);
        }
    };

    let response = env
        .get_identity()
        .decode_authn_method_remove_response(&response_data)
        .map_err(to_internal_error)?;

    match response {
        AuthnMethodRemoveRet::Ok => {
            log_info!(env, "Delete identity authn method: {pubkey:?} deleted.");
            update_holder(
                lock,
                HolderProcessingEvent::Capturing {
                    event: CaptureProcessingEvent::IdentityAuthnMethodDeleted {
                        public_key: pubkey.to_vec(),
                    },
                },
            )
            .map(|_| ProcessingResult::Continue)
        }
        AuthnMethodRemoveRet::Err => {
            log_error!(env, "Delete identity authn method: {pubkey:?} not found.");
            identity_authn_methods_resync(lock)
        }
    }
}

async fn exit_authn_method_registration(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Delete identity method registration: exiting ...");

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

    let response_data = match execute_ic_agent_request(env, ic_agent_request).await {
        Ok(data) => data,
        Err(err) => {
            log_error!(
                env,
                "Delete identity method registration: ic agent error {err:?}"
            );
            return identity_authn_methods_resync(lock);
        }
    };

    let response = env
        .get_identity()
        .decode_authn_method_registration_mode_exit_response(&response_data)
        .map_err(|err| {
            to_internal_error(format!(
                "AuthnMethodRegistrationModeExit response error: {err:?}"
            ))
        })?;

    match response {
        AuthnMethodRegistrationModeExitRet::Ok(()) => {
            log_info!(env, "Delete identity method registration: exited.");

            update_holder(
                lock,
                HolderProcessingEvent::Capturing {
                    event: CaptureProcessingEvent::IdentityAuthnMethodRegistrationExited,
                },
            )
            .map(|_| ProcessingResult::Continue)
        }
        AuthnMethodRegistrationModeExitRet::Err(err) => {
            log_error!(
                env,
                "Delete identity method registration: exit error: {err:?}"
            );
            identity_authn_methods_resync(lock)
        }
    }
}

async fn delete_openid_credential(
    env: &Environment,
    lock: &HolderLock,
    openid_credential_key: &OpenIdCredentialKey,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(
        env,
        "Delete identity openid credential: {openid_credential_key:?} ..."
    );

    let (request_definition, sender) = get_holder_model(|_, model| {
        (
            env.get_identity().build_openid_credential_remove_request(
                &model.identity_number.unwrap(),
                openid_credential_key,
            ),
            model.get_request_sender(),
        )
    });

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = match execute_ic_agent_request(env, ic_agent_request).await {
        Ok(data) => data,
        Err(err) => {
            log_error!(
                env,
                "Delete identity openid credential: ic agent error {err:?}"
            );
            return identity_authn_methods_resync(lock);
        }
    };

    let response = env
        .get_identity()
        .decode_openid_credential_remove_response(&response_data)
        .map_err(to_internal_error)?;

    match response {
        OpenidCredentialRemoveRet::Ok => {
            log_info!(
                env,
                "Delete identity openid credential: {openid_credential_key:?} deleted."
            );
            update_holder(
                lock,
                HolderProcessingEvent::Capturing {
                    event: CaptureProcessingEvent::IdentityOpenidCredentialDeleted {
                        openid_credential_key: openid_credential_key.clone(),
                    },
                },
            )
            .map(|_| ProcessingResult::Continue)
        }
        OpenidCredentialRemoveRet::Err(error) => match error {
            OpenIdCredentialRemoveError::InternalCanisterError(reason) => {
                Err(to_ic_agent_error(reason))
            }
            OpenIdCredentialRemoveError::OpenIdCredentialNotFound => {
                log_error!(
                    env,
                    "Can not delete openid credential {openid_credential_key:?}: not found"
                );
                identity_authn_methods_resync(lock)
            }
            OpenIdCredentialRemoveError::Unauthorized(..) => identity_authn_methods_resync(lock),
        },
    }
}

fn identity_authn_methods_resync(
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    update_holder(
        lock,
        HolderProcessingEvent::Capturing {
            event: CaptureProcessingEvent::IdentityAuthnMethodsResync,
        },
    )
    .map(|_| ProcessingResult::Continue)
}
