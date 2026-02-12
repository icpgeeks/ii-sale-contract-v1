use crate::{get_env, handlers::holder::build_holder_information_with_load};
use crate::{
    guards::caller_is_owner, handlers::holder::processor::update_holder_with_lock, log_info,
    model::holder::UpdateHolderError,
};
use contract_canister_api::types::holder::ReleaseProcessingEvent;
use contract_canister_api::{restart_release_identity::*, types::holder::HolderProcessingEvent};
use ic_cdk_macros::update;

#[update]
async fn restart_release_identity(Args { registration_id }: Args) -> Response {
    restart_release_identity_int(registration_id).await.into()
}

pub(crate) async fn restart_release_identity_int(
    registration_id: Option<String>,
) -> Result<RestartReleaseIdentityResult, RestartReleaseIdentityError> {
    caller_is_owner().map_err(|_| RestartReleaseIdentityError::PermissionDenied)?;

    let env = get_env();

    log_info!(env, "Identity release: restarting...");

    update_holder_with_lock(HolderProcessingEvent::Releasing {
        event: ReleaseProcessingEvent::ReleaseRestarted { registration_id },
    })
    .map(|_| RestartReleaseIdentityResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => RestartReleaseIdentityError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => {
            RestartReleaseIdentityError::HolderLocked {
                lock: env.get_time().get_delayed_time_millis(expiration),
            }
        }
    })
}
