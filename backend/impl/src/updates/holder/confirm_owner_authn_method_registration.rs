use ic_cdk_macros::update;

use contract_canister_api::types::holder::ReleaseProcessingEvent;
use contract_canister_api::{
    confirm_owner_authn_method_registration::*, types::holder::HolderProcessingEvent,
};

use crate::{get_env, handlers::holder::build_holder_information_with_load};
use crate::{
    guards::caller_is_owner, handlers::holder::processor::update_holder_with_lock, log_info,
    model::holder::UpdateHolderError,
};

#[update]
async fn confirm_owner_authn_method_registration(args: Args) -> Response {
    confirm_owner_authn_method_registration_int(args)
        .await
        .into()
}

pub(crate) async fn confirm_owner_authn_method_registration_int(
    Args { verification_code }: Args,
) -> Result<ConfirmOwnerAuthnMethodRegistrationResult, ConfirmOwnerAuthnMethodRegistrationError> {
    caller_is_owner().map_err(|_| ConfirmOwnerAuthnMethodRegistrationError::PermissionDenied)?;

    let env = get_env();

    log_info!(
        env,
        "Owner authn method registration: verification code receiving..."
    );

    update_holder_with_lock(HolderProcessingEvent::Releasing {
        event: ReleaseProcessingEvent::ConfirmAuthnMethodRegistration { verification_code },
    })
    .map(|_| ConfirmOwnerAuthnMethodRegistrationResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => ConfirmOwnerAuthnMethodRegistrationError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => {
            ConfirmOwnerAuthnMethodRegistrationError::HolderLocked {
                lock: env.get_time().get_delayed_time_millis(expiration),
            }
        }
    })
}
