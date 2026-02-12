use crate::{
    handlers::holder::processor::update_holder_with_lock, log_info,
    model::holder::UpdateHolderError,
};
use contract_canister_api::{
    retry_prepare_delegation::*,
    types::holder::{
        FetchAssetsEvent, HolderProcessingEvent, HoldingProcessingEvent, ObtainDelegationEvent,
    },
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn retry_prepare_delegation(_args: Args) -> Response {
    retry_prepare_delegation_int().await.into()
}

pub(crate) async fn retry_prepare_delegation_int(
) -> Result<RetryPrepareDelegationResult, RetryPrepareDelegationError> {
    let env = get_env();

    log_info!(env, "Delegation preparation: retrying...");

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::FetchAssets {
            event: FetchAssetsEvent::ObtainDelegation {
                event: ObtainDelegationEvent::RetryPrepareDelegation,
            },
        },
    })
    .map(|_| RetryPrepareDelegationResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => RetryPrepareDelegationError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => {
            RetryPrepareDelegationError::HolderLocked {
                lock: env.get_time().get_delayed_time_millis(expiration),
            }
        }
    })
}
