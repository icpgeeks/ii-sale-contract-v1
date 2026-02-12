use crate::{
    guards::caller_is_authenticated,
    handlers::holder::{processor::update_holder_with_lock, states::get_holder_model},
    log_info,
    model::holder::{events::sale::get_buyer_offer, UpdateHolderError},
};
use contract_canister_api::{
    cancel_buyer_offer::*,
    types::holder::{HolderProcessingEvent, HoldingProcessingEvent, SaleDealProcessingEvent},
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update(guard = "caller_is_authenticated")]
async fn cancel_buyer_offer(_args: Args) -> Response {
    cancel_buyer_offer_int().await.into()
}

pub(crate) async fn cancel_buyer_offer_int() -> Result<CancelBuyerOfferResult, CancelBuyerOfferError>
{
    let env = get_env();
    let caller = env.get_ic().get_caller();

    get_holder_model(|_, model| {
        get_buyer_offer(model, &caller)
            .ok_or(CancelBuyerOfferError::NoBuyerOffer)
            .map(|_| ())
    })?;

    log_info!(env, "Buyer offer: canceling by buyer: {}", caller.to_text());

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::SaleDeal {
            event: Box::new(SaleDealProcessingEvent::CancelBuyerOffer { buyer: caller }),
        },
    })
    .map(|_| CancelBuyerOfferResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => CancelBuyerOfferError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => CancelBuyerOfferError::HolderLocked {
            lock: env.get_time().get_delayed_time_millis(expiration),
        },
    })
}
