use crate::{
    guards::caller_is_owner, handlers::holder::processor::update_holder_with_lock, log_info,
    model::holder::UpdateHolderError,
};
use contract_canister_api::{
    confirm_holder_authn_method_registration::*,
    types::holder::{CaptureProcessingEvent, HolderProcessingEvent},
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn confirm_holder_authn_method_registration(Args { frontend_hostname }: Args) -> Response {
    confirm_holder_authn_method_registration_int(frontend_hostname)
        .await
        .into()
}

pub(crate) async fn confirm_holder_authn_method_registration_int(
    frontend_hostname: String,
) -> Result<ConfirmHolderAuthnMethodRegistrationResult, ConfirmHolderAuthnMethodRegistrationError> {
    caller_is_owner().map_err(|_| ConfirmHolderAuthnMethodRegistrationError::PermissionDenied)?;

    let env = get_env();

    log_info!(
        env,
        "Holder authn method registration: confirmation starting (frontend: {frontend_hostname})...",
    );

    update_holder_with_lock(HolderProcessingEvent::Capturing {
        event: CaptureProcessingEvent::AuthnMethodSessionRegistrationConfirmed {
            frontend_hostname,
        },
    })
    .map(|_| ConfirmHolderAuthnMethodRegistrationResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => {
            ConfirmHolderAuthnMethodRegistrationError::HolderWrongState
        }
        UpdateHolderError::HolderIsLocked { expiration } => {
            ConfirmHolderAuthnMethodRegistrationError::HolderLocked {
                lock: env.get_time().get_delayed_time_millis(expiration),
            }
        }
    })
}
