use crate::{
    guards::caller_is_authenticated,
    handlers::{
        cycles_calculator::get_cycles_calculator,
        holder::{processor::update_holder_with_lock, states::get_trading_sale_deal},
        wallet::check_approved_balance,
    },
    log_info,
    model::holder::UpdateHolderError,
    updates::holder::set_buyer_offer::{find_previous_referral, validate_referral},
};
use common_canister_types::{LedgerAccount, TokenE8s};
use contract_canister_api::{
    accept_seller_offer::*,
    types::holder::{HolderProcessingEvent, HoldingProcessingEvent, SaleDealProcessingEvent},
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update(guard = "caller_is_authenticated")]
async fn accept_seller_offer(
    Args {
        approved_account,
        referral,
        price,
    }: Args,
) -> Response {
    accept_seller_offer_int(approved_account, referral, price)
        .await
        .into()
}

pub(crate) async fn accept_seller_offer_int(
    approved_account: LedgerAccount,
    referral: Option<String>,
    price: TokenE8s,
) -> Result<AcceptSellerOfferResult, AcceptSellerOfferError> {
    let env = get_env();
    let caller = env.get_ic().get_caller();

    if !validate_referral(env.as_ref(), referral.as_ref()) {
        return Err(AcceptSellerOfferError::InvalidReferral);
    }

    let (expiration, seller_price) = get_trading_sale_deal(|_, _, sale_deal| {
        sale_deal.map(|sale_deal| (sale_deal.expiration_time, sale_deal.get_price()))
    })
    .ok_or(AcceptSellerOfferError::HolderWrongState)?;

    if seller_price != price {
        return Err(AcceptSellerOfferError::PriceMismatch);
    }

    let cycles_calculator = get_cycles_calculator();
    if cycles_calculator.is_critical_cycles_level() {
        return Err(AcceptSellerOfferError::CriticalCyclesLevel {
            critical_threshold_cycles: cycles_calculator
                .get_cycles_state()
                .critical_threshold_cycles,
        });
    }

    check_approved_balance(env.as_ref(), caller, &approved_account, price, expiration)
        .await
        .map_err(|error| AcceptSellerOfferError::CheckApprovedBalanceError { error })?;

    let previous_referral = find_previous_referral(&caller);

    log_info!(
        env,
        "Accept seller offer: accepting by buyer: {}, price: {price:?}, approved account: {:?}, referral: {referral:?}, previous referral: {previous_referral:?}",
        caller.to_text(),
        &approved_account,
    );

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::SaleDeal {
            event: Box::new(SaleDealProcessingEvent::AcceptSellerOffer {
                buyer: caller,
                approved_account,
                referral,
                previous_referral,
                price,
                expiration,
            }),
        },
    })
    .map(|_| AcceptSellerOfferResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => AcceptSellerOfferError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => AcceptSellerOfferError::HolderLocked {
            lock: env.get_time().get_delayed_time_millis(expiration),
        },
    })
}
