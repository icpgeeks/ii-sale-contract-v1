use crate::{
    guards::caller_is_owner, handlers::holder::processor::update_holder_with_lock, log_info,
    model::holder::UpdateHolderError,
};
use contract_canister_api::{
    protected_authn_method_deleted::*,
    types::holder::{CaptureProcessingEvent, HolderProcessingEvent},
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn protected_authn_method_deleted(_args: Args) -> Response {
    protected_authn_method_deleted_int().await.into()
}

pub(crate) async fn protected_authn_method_deleted_int(
) -> Result<ProtectedAuthnMethodDeletedResult, ProtectedAuthnMethodDeletedError> {
    caller_is_owner().map_err(|_| ProtectedAuthnMethodDeletedError::PermissionDenied)?;

    let env = get_env();

    log_info!(env, "Protected authn method: deleting...");

    update_holder_with_lock(HolderProcessingEvent::Capturing {
        event: CaptureProcessingEvent::ProtectedIdentityAuthnMethodDeleted,
    })
    .map(|_| ProtectedAuthnMethodDeletedResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => ProtectedAuthnMethodDeletedError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => {
            ProtectedAuthnMethodDeletedError::HolderLocked {
                lock: env.get_time().get_delayed_time_millis(expiration),
            }
        }
    })
}
