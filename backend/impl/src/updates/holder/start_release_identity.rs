use crate::{
    guards::caller_is_owner, handlers::holder::processor::update_holder_with_lock, log_info,
    model::holder::UpdateHolderError,
};
use contract_canister_api::{
    start_release_identity::*,
    types::holder::{HolderProcessingEvent, HoldingProcessingEvent},
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn start_release_identity(_args: Args) -> Response {
    start_release_identity_int().await.into()
}

pub(crate) async fn start_release_identity_int(
) -> Result<StartReleaseIdentityResult, StartReleaseIdentityError> {
    caller_is_owner().map_err(|_| StartReleaseIdentityError::PermissionDenied)?;

    let env = get_env();

    log_info!(env, "Identity release: starting...");

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::StartRelease,
    })
    .map(|_| StartReleaseIdentityResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => StartReleaseIdentityError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => {
            StartReleaseIdentityError::HolderLocked {
                lock: env.get_time().get_delayed_time_millis(expiration),
            }
        }
    })
}
