use ic_cdk_macros::update;

use contract_canister_api::types::holder::ReleaseProcessingEvent;
use contract_canister_api::{delete_holder_authn_method::*, types::holder::HolderProcessingEvent};

use crate::{get_env, handlers::holder::build_holder_information_with_load};
use crate::{
    guards::caller_is_owner, handlers::holder::processor::update_holder_with_lock, log_info,
    model::holder::UpdateHolderError,
};

#[update]
async fn delete_holder_authn_method(_args: Args) -> Response {
    delete_holder_authn_method_int().await.into()
}

pub(crate) async fn delete_holder_authn_method_int(
) -> Result<DeleteHolderAuthnMethodResult, DeleteHolderAuthnMethodError> {
    caller_is_owner().map_err(|_| DeleteHolderAuthnMethodError::PermissionDenied)?;

    let env = get_env();

    log_info!(env, "Holder authn method: deleting ...");

    update_holder_with_lock(HolderProcessingEvent::Releasing {
        event: ReleaseProcessingEvent::DeleteHolderAuthnMethod,
    })
    .map(|_| DeleteHolderAuthnMethodResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => DeleteHolderAuthnMethodError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => {
            DeleteHolderAuthnMethodError::HolderLocked {
                lock: env.get_time().get_delayed_time_millis(expiration),
            }
        }
    })
}
