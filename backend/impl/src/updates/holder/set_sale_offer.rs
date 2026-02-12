use crate::{
    guards::caller_is_owner,
    handlers::holder::{processor::update_holder_with_lock, states::get_holder_model},
    log_info,
    model::holder::UpdateHolderError,
};
use common_canister_types::TokenE8s;
use contract_canister_api::{
    set_sale_offer::*,
    types::holder::{
        HolderProcessingEvent, HolderState, HoldingProcessingEvent, HoldingState,
        SaleDealProcessingEvent, SaleDealState,
    },
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn set_sale_offer(Args { price }: Args) -> Response {
    set_sale_offer_int(price).await.into()
}

pub(crate) async fn set_sale_offer_int(
    price: TokenE8s,
) -> Result<SetSaleOfferResult, SetSaleOfferError> {
    caller_is_owner().map_err(|_| SetSaleOfferError::PermissionDenied)?;

    let env = get_env();

    let min_sell_price_inclusively = env.get_settings().min_sell_price_inclusively;
    if price < min_sell_price_inclusively {
        return Err(SetSaleOfferError::PriceTooLow {
            min_sell_price_inclusively,
        });
    }

    get_holder_model(|_, model| {
        if let HolderState::Holding {
            sub_state:
                HoldingState::Hold {
                    sale_deal_state: Some(SaleDealState::WaitingSellOffer | SaleDealState::Trading),
                    ..
                },
        } = &model.state.value
        {
            let sale_deal = model.sale_deal.as_ref().unwrap();
            let now = env.get_time().get_current_unix_epoch_time_millis();
            if sale_deal.expiration_time <= now {
                return Err(SetSaleOfferError::HolderWrongState);
            }

            sale_deal
                .offers
                .iter()
                .find(|offer| offer.offer_amount >= price)
                .map_or(Ok(()), |_| Err(SetSaleOfferError::HigherBuyerOfferExists))
        } else {
            Err(SetSaleOfferError::HolderWrongState)
        }
    })?;

    log_info!(env, "Sale offer: setting with price: {price}");

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::SaleDeal {
            event: Box::new(SaleDealProcessingEvent::SetSaleOffer { price }),
        },
    })
    .map(|_| SetSaleOfferResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => SetSaleOfferError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => SetSaleOfferError::HolderLocked {
            lock: env.get_time().get_delayed_time_millis(expiration),
        },
    })
}
