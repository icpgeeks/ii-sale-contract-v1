use std::ops::Deref;

use crate::{
    components::Environment,
    guards::caller_is_authenticated,
    handlers::{
        holder::{
            processor::update_holder_with_lock,
            states::{get_holder_model, get_trading_sale_deal},
        },
        wallet::check_approved_balance,
    },
    log_info,
    model::holder::{events::sale::get_buyer_offer, UpdateHolderError},
};
use candid::Principal;
use common_canister_types::{LedgerAccount, TokenE8s};
use contract_canister_api::{
    set_buyer_offer::*,
    types::holder::{HolderProcessingEvent, HoldingProcessingEvent, SaleDealProcessingEvent},
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update(guard = "caller_is_authenticated")]
async fn set_buyer_offer(
    Args {
        approved_account,
        referral,
        offer_amount,
    }: Args,
) -> Response {
    set_buyer_offer_int(approved_account, referral, offer_amount)
        .await
        .into()
}

pub(crate) async fn set_buyer_offer_int(
    approved_account: LedgerAccount,
    referral: Option<String>,
    offer_amount: TokenE8s,
) -> Result<SetBuyerOfferResult, SetBuyerOfferError> {
    let env = get_env();
    let caller = env.get_ic().get_caller();

    if !validate_referral(env.as_ref(), referral.as_ref()) {
        return Err(SetBuyerOfferError::InvalidReferral);
    }

    let min_sell_price_inclusively = env.get_settings().min_sell_price_inclusively;
    if offer_amount < min_sell_price_inclusively {
        return Err(SetBuyerOfferError::OfferAmountTooLow {
            min_sell_price_inclusively,
        });
    }

    let (expiration, seller_price, max_buyer_offers) =
        get_trading_sale_deal(|state, _, sale_deal| {
            sale_deal.map(|sale_deal| {
                (
                    sale_deal.expiration_time,
                    sale_deal.get_price(),
                    state.get_env().get_settings().max_buyer_offers,
                )
            })
        })
        .ok_or(SetBuyerOfferError::HolderWrongState)?;

    if offer_amount >= seller_price {
        return Err(SetBuyerOfferError::OfferAmountExceedsPrice);
    }

    check_approved_balance(
        env.as_ref(),
        caller,
        &approved_account,
        offer_amount,
        expiration,
    )
    .await
    .map_err(|error| SetBuyerOfferError::CheckApprovedBalanceError { error })?;

    let previous_referral = find_previous_referral(&caller);

    log_info!(
        env,
        "Buyer offer: setting by buyer: {}, amount: {offer_amount:?}, approved account: {:?}, referral: {referral:?}, previous referral: {previous_referral:?}",
        caller.to_text(),
        &approved_account,
    );

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::SaleDeal {
            event: Box::new(SaleDealProcessingEvent::SetBuyerOffer {
                buyer: caller,
                approved_account,
                referral,
                previous_referral,
                offer_amount,
                expiration,
                max_buyer_offers,
            }),
        },
    })
    .map(|_| SetBuyerOfferResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => SetBuyerOfferError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => SetBuyerOfferError::HolderLocked {
            lock: env.get_time().get_delayed_time_millis(expiration),
        },
    })
}

pub(crate) fn validate_referral(env: &Environment, referral: Option<&String>) -> bool {
    referral
        .map(|str| str.len() <= env.get_settings().max_referral_length)
        .unwrap_or(true)
}

pub(crate) fn find_previous_referral(caller: &Principal) -> Option<String> {
    get_holder_model(|state, model| {
        if let Some(offer) = get_buyer_offer(model, caller) {
            return offer.referral.clone();
        }

        let len = state.get_model().get_holder().get_events_len();
        for i in 0..len {
            let event = state.get_model().get_holder().get_event(i).unwrap();
            if let HolderProcessingEvent::Holding {
                event: HoldingProcessingEvent::SaleDeal { event },
            } = &event.value
            {
                if let SaleDealProcessingEvent::SetBuyerOffer {
                    referral, buyer, ..
                } = event.deref()
                {
                    if buyer == caller && referral.is_some() {
                        return referral.clone();
                    }
                }
            }
        }
        None
    })
}
