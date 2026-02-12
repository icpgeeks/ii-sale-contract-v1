use crate::{
    guards::caller_is_owner, handlers::holder::processor::update_holder_with_lock, log_info,
    model::holder::UpdateHolderError,
};
use contract_canister_api::{
    cancel_sale_intention::*,
    types::holder::{HolderProcessingEvent, HoldingProcessingEvent, SaleDealProcessingEvent},
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn cancel_sale_intention(_args: Args) -> Response {
    cancel_sale_intention_int().await.into()
}

pub(crate) async fn cancel_sale_intention_int(
) -> Result<CancelSaleIntentionResult, CancelSaleIntentionError> {
    caller_is_owner().map_err(|_| CancelSaleIntentionError::PermissionDenied)?;

    let env = get_env();

    log_info!(env, "Sale intention: canceling...");

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::SaleDeal {
            event: Box::new(SaleDealProcessingEvent::CancelSaleIntention),
        },
    })
    .map(|_| CancelSaleIntentionResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => CancelSaleIntentionError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => {
            CancelSaleIntentionError::HolderLocked {
                lock: env.get_time().get_delayed_time_millis(expiration),
            }
        }
    })
}
