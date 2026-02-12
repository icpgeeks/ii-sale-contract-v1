use crate::{
    guards::caller_is_owner,
    handlers::holder::{get_checked_sale_deal_expiration_time, processor::update_holder_with_lock},
    log_info,
    model::holder::UpdateHolderError,
};
use contract_canister_api::{start_capture_identity::*, types::holder::HolderProcessingEvent};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn start_capture_identity(Args { identity_number }: Args) -> Response {
    start_capture_identity_int(identity_number).await.into()
}

pub(crate) async fn start_capture_identity_int(
    identity_number: u64,
) -> Result<StartCaptureIdentityResult, StartCaptureIdentityError> {
    caller_is_owner().map_err(|_| StartCaptureIdentityError::PermissionDenied)?;

    let _ = get_checked_sale_deal_expiration_time()
        .map_err(|_| StartCaptureIdentityError::CertificateExpirationImminent)?;

    let env = get_env();

    log_info!(
        env,
        "Identity capture: starting, identity number: {identity_number}"
    );

    update_holder_with_lock(HolderProcessingEvent::StartCaptureIdentity { identity_number })
        .map(|_| StartCaptureIdentityResult {
            holder_information: build_holder_information_with_load(),
        })
        .map_err(|error| match error {
            UpdateHolderError::WrongState => StartCaptureIdentityError::HolderWrongState,
            UpdateHolderError::HolderIsLocked { expiration } => {
                StartCaptureIdentityError::HolderLocked {
                    lock: env.get_time().get_delayed_time_millis(expiration),
                }
            }
        })
}
