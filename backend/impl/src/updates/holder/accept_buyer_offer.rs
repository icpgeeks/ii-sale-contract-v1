use crate::{
    components::Environment,
    guards::caller_is_owner,
    handlers::{
        cycles_calculator::get_cycles_calculator,
        holder::{processor::update_holder_with_lock, states::get_trading_sale_deal},
        wallet::check_approved_balance,
    },
    log_info,
    model::holder::{events::sale::get_buyer_offer, UpdateHolderError},
};
use candid::Principal;
use common_canister_types::{LedgerAccount, TimestampMillis, TokenE8s};
use contract_canister_api::{
    accept_buyer_offer::*,
    types::holder::{
        CheckApprovedBalanceError, HolderProcessingEvent, HoldingProcessingEvent,
        SaleDealProcessingEvent,
    },
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn accept_buyer_offer(args: Args) -> Response {
    accept_buyer_offer_int(args).await.into()
}

pub(crate) async fn accept_buyer_offer_int(
    Args {
        buyer,
        offer_amount,
        check_higher_offer,
    }: Args,
) -> Result<AcceptBuyerOfferResult, AcceptBuyerOfferError> {
    caller_is_owner().map_err(|_| AcceptBuyerOfferError::PermissionDenied)?;

    let cycles_calculator = get_cycles_calculator();
    if cycles_calculator.is_critical_cycles_level() {
        return Err(AcceptBuyerOfferError::CriticalCyclesLevel {
            critical_threshold_cycles: cycles_calculator
                .get_cycles_state()
                .critical_threshold_cycles,
        });
    }

    let env = get_env();

    let (expiration, approved_account) = get_trading_sale_deal(|_, model, sale_deal| {
        if let Some(sale_deal) = sale_deal {
            let offer =
                get_buyer_offer(model, &buyer).ok_or(AcceptBuyerOfferError::OfferNotFound)?;

            if offer.offer_amount != offer_amount {
                return Err(AcceptBuyerOfferError::OfferMismatch);
            }

            if check_higher_offer
                && sale_deal
                    .offers
                    .iter()
                    .any(|o| o.offer_amount > offer_amount)
            {
                return Err(AcceptBuyerOfferError::HigherBuyerOfferExists);
            }

            Ok((sale_deal.expiration_time, offer.approved_account.clone()))
        } else {
            Err(AcceptBuyerOfferError::HolderWrongState)
        }
    })?;

    check_accepted_offer_balance(
        env.as_ref(),
        buyer,
        &approved_account,
        offer_amount,
        expiration,
    )
    .await?;

    log_info!(
        env,
        "Buyer offer: accepting for buyer: {buyer:?}, amount: {offer_amount:?}"
    );

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::SaleDeal {
            event: Box::new(SaleDealProcessingEvent::AcceptBuyerOffer {
                buyer,
                offer_amount,
            }),
        },
    })
    .map(|_| AcceptBuyerOfferResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => AcceptBuyerOfferError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => AcceptBuyerOfferError::HolderLocked {
            lock: env.get_time().get_delayed_time_millis(expiration),
        },
    })
}

async fn check_accepted_offer_balance(
    env: &Environment,
    buyer: Principal,
    approved_account: &LedgerAccount,
    offer_amount: TokenE8s,
    expiration: TimestampMillis,
) -> Result<(), AcceptBuyerOfferError> {
    check_approved_balance(env, buyer, approved_account, offer_amount, expiration)
        .await
        .map_err(|error| match error {
            CheckApprovedBalanceError::InsufficientBalance
            | CheckApprovedBalanceError::InsufficientAllowance
            | CheckApprovedBalanceError::AllowanceExpiresTooEarly => {
                log_info!(
                    env,
                    "Buyer offer: removing failed offer for buyer {:?} due to error: {error:?}",
                    buyer.to_text()
                );

                match remove_failed_buyer_offer(env, buyer, offer_amount) {
                    Ok(()) => AcceptBuyerOfferError::OfferRemoved,
                    Err(error) => error,
                }
            }
            _ => AcceptBuyerOfferError::CheckApprovedBalanceError { error },
        })
}

fn remove_failed_buyer_offer(
    env: &Environment,
    buyer: Principal,
    offer_amount: TokenE8s,
) -> Result<(), AcceptBuyerOfferError> {
    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::SaleDeal {
            event: Box::new(SaleDealProcessingEvent::RemoveFailedBuyerOffer {
                buyer,
                offer_amount,
            }),
        },
    })
    .map(|_| ())
    .map_err(|error| match error {
        UpdateHolderError::WrongState => AcceptBuyerOfferError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => AcceptBuyerOfferError::HolderLocked {
            lock: env.get_time().get_delayed_time_millis(expiration),
        },
    })
}
