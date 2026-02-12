use crate::{
    guards::caller_is_owner, handlers::holder::processor::update_holder_with_lock, log_info,
    model::holder::UpdateHolderError,
};
use common_canister_impl::handlers::ic_request::builder::BuildRequestEnvironment;
use contract_canister_api::{
    cancel_capture_identity::*,
    types::holder::{CaptureProcessingEvent, HolderProcessingEvent},
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn cancel_capture_identity(_args: Args) -> Response {
    cancel_capture_identity_int().await.into()
}

pub(crate) async fn cancel_capture_identity_int(
) -> Result<CancelCaptureIdentityResult, CancelCaptureIdentityError> {
    caller_is_owner().map_err(|_| CancelCaptureIdentityError::PermissionDenied)?;

    let env = get_env();

    log_info!(env, "Capture identity: canceling...");

    update_holder_with_lock(HolderProcessingEvent::Capturing {
        event: CaptureProcessingEvent::CancelCapture,
    })
    .map(|_| CancelCaptureIdentityResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => CancelCaptureIdentityError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => {
            CancelCaptureIdentityError::HolderLocked {
                lock: env.get_time_().get_delayed_time_millis(expiration),
            }
        }
    })
}
