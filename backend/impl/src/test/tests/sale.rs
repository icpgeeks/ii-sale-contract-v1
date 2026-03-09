use candid::Principal;
use common_canister_impl::components::ledger::to_account_identifier;
use common_canister_types::{LedgerAccount, TokenE8s};
use contract_canister_api::{
    accept_buyer_offer::{AcceptBuyerOfferArgs, AcceptBuyerOfferError},
    accept_seller_offer::AcceptSellerOfferError,
    cancel_buyer_offer::CancelBuyerOfferError,
    cancel_sale_intention::CancelSaleIntentionError,
    change_sale_intention::{ChangeSaleIntentionArgs, ChangeSaleIntentionError},
    set_buyer_offer::SetBuyerOfferError,
    set_sale_intention::SetSaleIntentionError,
    set_sale_offer::SetSaleOfferError,
    start_release_identity::StartReleaseIdentityError,
    types::holder::{
        BuyerOffer, CheckApprovedBalanceError, HolderInformation, HolderState, HoldingState,
        ReferralRewardData, SaleDealAcceptSubState, SaleDealState, UnsellableReason,
    },
};

use crate::{
    get_env,
    handlers::{
        holder::{build_holder_information_with_load, states::get_holder_model},
        rewards_calculator::get_permyriad,
        wallet::get_sale_deal_transit_sub_account,
    },
    model::holder::events::sale::get_buyer_offer,
    result_err_matches, result_ok_with_holder_information,
    test::tests::{
        components::{
            ic::set_test_caller,
            icrc2_ledger::ht_approve_account,
            ledger::{
                ht_deposit_account, ht_get_account_balance, ht_withdraw_from_account, HT_LEDGER_FEE,
            },
            referral::ht_get_referral_account,
            time::set_test_time,
        },
        drivers::{
            fetch::FetchConfig,
            hold::{drive_after_quarantine, drive_to_standard_hold},
        },
        ht_get_critical_cycles_threshold, ht_get_test_buyer, ht_get_test_contract_canister,
        ht_get_test_deployer, ht_get_test_hub_canister, ht_get_test_other,
        ht_set_cycles_above_critical_threshold, HT_MIN_PRICE, HT_QUARANTINE_DURATION,
        HT_SALE_DEAL_SAFE_CLOSE_DURATION,
    },
    test_state_matches,
    updates::holder::{
        accept_buyer_offer::accept_buyer_offer_int, accept_seller_offer::accept_seller_offer_int,
        cancel_buyer_offer::cancel_buyer_offer_int,
        cancel_sale_intention::cancel_sale_intention_int,
        change_sale_intention::change_sale_intention_int, set_buyer_offer::set_buyer_offer_int,
        set_sale_intention::set_sale_intention_int, set_sale_offer::set_sale_offer_int,
        start_release_identity::start_release_identity_int,
    },
};

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/// Funds the given approved account for a buyer offer in one step:
/// sets the ICRC-2 allowance and deposits the ICP balance.
///
/// The allowance expiration is taken directly from the current sale deal's
/// `expiration_time` — meaning this helper is only valid after a sale deal
/// has been created (i.e. after `ht_set_sale_intentions`).
///
/// For scenarios that intentionally use *different* amounts for the allowance
/// vs the deposit (e.g. `test_set_buyer_offer_low_allowance`), call
/// `ht_approve_account` + `ht_deposit_account` manually.
fn ht_fund_approved_account(approved_account: &LedgerAccount, amount: TokenE8s) {
    let identifier = to_account_identifier(approved_account).unwrap();
    let expires_at = get_holder_model(|_, model| model.sale_deal.as_ref().unwrap().expiration_time);
    ht_approve_account(identifier.to_hex(), expires_at, amount);
    ht_deposit_account(&identifier, amount);
}

#[tokio::test]
async fn test_sale_quarantine() {
    drive_to_standard_hold(ht_get_test_deployer()).await;

    set_test_time(HT_QUARANTINE_DURATION);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: None
        }
    });

    ht_end_quarantine().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: None
        }
    });
}

#[tokio::test]
async fn test_sale_expired() {
    drive_to_standard_hold(ht_get_test_deployer()).await;

    set_test_time(HT_QUARANTINE_DURATION);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: None
        }
    });

    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });
}

#[tokio::test]
async fn test_sale_intentions() {
    let owner = ht_get_test_deployer();
    drive_to_standard_hold(owner).await;

    // check permission denied
    set_test_time(10);
    set_test_caller(ht_get_test_other());

    let result = set_sale_intention_int(LedgerAccount::Account {
        owner,
        subaccount: None,
    })
    .await;
    result_err_matches!(result, SetSaleIntentionError::PermissionDenied);

    set_test_caller(owner);

    // check invalid account identifier
    let result = set_sale_intention_int(LedgerAccount::AccountIdentifier { slice: vec![1] }).await;
    result_err_matches!(result, SetSaleIntentionError::InvalidAccountIdentifier);

    // check certificate expiration imminent
    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);
    let receiver_account = LedgerAccount::Account {
        owner,
        subaccount: None,
    };
    let result = set_sale_intention_int(receiver_account.clone()).await;
    result_err_matches!(result, SetSaleIntentionError::CertificateExpirationImminent);

    // check fail change
    let result = change_sale_intention_int(ChangeSaleIntentionArgs { receiver_account }).await;
    result_err_matches!(result, ChangeSaleIntentionError::HolderWrongState);

    // check ok
    set_test_time(20);
    let result = set_sale_intention_int(LedgerAccount::Account {
        owner,
        subaccount: None,
    })
    .await;
    assert!(result.is_ok());
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: Some(SaleDealState::WaitingSellOffer)
        }
    });

    get_holder_model(|_, model| {
        let sale_deal = model.sale_deal.as_ref().unwrap();
        assert_eq!(sale_deal.expiration_time, HT_SALE_DEAL_SAFE_CLOSE_DURATION);
        assert!(sale_deal.sale_price.is_none());
        assert!(
            matches!(sale_deal.receiver_account, LedgerAccount::Account { owner: account_owner, subaccount: None } if account_owner == owner)
        );
        assert!(sale_deal.offers.is_empty());
    });

    // check fail change invalid account identifier
    let result = change_sale_intention_int(ChangeSaleIntentionArgs {
        receiver_account: LedgerAccount::AccountIdentifier { slice: vec![1] },
    })
    .await;
    result_err_matches!(result, ChangeSaleIntentionError::InvalidAccountIdentifier);

    // check ok change
    let result = change_sale_intention_int(ChangeSaleIntentionArgs {
        receiver_account: LedgerAccount::Account {
            owner: ht_get_test_contract_canister(),
            subaccount: None,
        },
    })
    .await;
    let holder_information = result_ok_with_holder_information!(result);
    let sale_deal = holder_information.sale_deal.as_ref().unwrap();
    assert!(
        matches!(sale_deal.receiver_account, LedgerAccount::Account { owner: account_owner, subaccount: None } if account_owner == ht_get_test_contract_canister())
    );

    // cancel sale intention wrong permission
    set_test_caller(ht_get_test_other());
    let result = cancel_sale_intention_int().await;
    result_err_matches!(result, CancelSaleIntentionError::PermissionDenied);

    // cancel sale intention ok
    set_test_caller(owner);
    let result = cancel_sale_intention_int().await;
    result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: None
        },
    });
}

pub(crate) async fn ht_set_sale_intentions(owner: Principal) {
    set_test_caller(owner);
    set_test_time(0);

    let result = set_sale_intention_int(LedgerAccount::Account {
        owner,
        subaccount: None,
    })
    .await;
    assert!(result.is_ok());
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: Some(SaleDealState::WaitingSellOffer)
        }
    });
}

#[tokio::test]
async fn test_sale_intention_after_sellable_expiration() {
    let owner = ht_get_test_deployer();
    drive_to_standard_hold(owner).await;

    // END OF QUARANTINE

    ht_end_quarantine().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: None
        }
    });

    // END OF SELLABLE PERIOD

    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    set_test_caller(owner);
    let result = set_sale_intention_int(LedgerAccount::Account {
        owner,
        subaccount: None,
    })
    .await;
    result_err_matches!(result, SetSaleIntentionError::CertificateExpirationImminent);
}

pub(crate) async fn ht_end_quarantine() {
    drive_after_quarantine(&FetchConfig::single_no_neurons()).await;
}

/// Drives the state machine to `HoldingState::Hold { quarantine: None, sale_deal_state: Trading }`.
///
/// Executes the full sequence:
/// 1. `drive_to_standard_hold(owner)` — capture → fetch → check → Hold (in quarantine)
/// 2. `ht_set_sale_intentions(owner)` — sets seller account + transitions to WaitingSellOffer
/// 3. `ht_set_sale_offer(owner, sale_price)` — sets sell price → transitions to Trading
/// 4. `ht_end_quarantine()` — advances past quarantine → re-fetch/re-check cycle → Hold (no quarantine)
///
/// Use this in tests that need to start from a ready-to-trade state without caring about the
/// intermediate capture/fetch/check/quarantine steps.
pub(crate) async fn ht_drive_to_trading(owner: Principal, sale_price: TokenE8s) {
    drive_to_standard_hold(owner).await;
    ht_set_sale_intentions(owner).await;
    ht_set_sale_offer(owner, sale_price).await;
    ht_end_quarantine().await;
}

#[tokio::test]
async fn test_sale_offer() {
    let owner = ht_get_test_deployer();
    drive_to_standard_hold(owner).await;
    ht_set_sale_intentions(owner).await;

    set_test_time(10);
    set_test_caller(ht_get_test_hub_canister());

    let result = set_sale_offer_int(10).await;
    result_err_matches!(result, SetSaleOfferError::PermissionDenied);

    set_test_caller(owner);

    let result = set_sale_offer_int(10).await;
    result_err_matches!(
        result,
        SetSaleOfferError::PriceTooLow {
            min_sell_price_inclusively: HT_MIN_PRICE
        }
    );

    let result = set_sale_offer_int(HT_MIN_PRICE).await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        HT_MIN_PRICE
    );
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    let holder_information = ht_set_sale_offer(owner, HT_MIN_PRICE + 40_000).await;
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        HT_MIN_PRICE + 40_000
    );

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    let holder_information = ht_set_sale_offer(owner, HT_MIN_PRICE).await;
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        HT_MIN_PRICE
    );

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    // END OF QUARANTINE
    ht_end_quarantine().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    // CANCEL SALE DEAL AFTER EXPIRATION

    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired,
        }
    });
}

pub(crate) async fn ht_set_sale_offer(owner: Principal, price: TokenE8s) -> HolderInformation {
    set_test_caller(owner);
    let result = set_sale_offer_int(price).await;
    result_ok_with_holder_information!(result)
}

fn ht_find_offer_by_buyer<'a>(
    holder_information: &'a HolderInformation,
    buyer: &Principal,
) -> Option<&'a BuyerOffer> {
    holder_information
        .sale_deal
        .as_ref()
        .unwrap()
        .offers
        .iter()
        .find(|offer| &offer.buyer == buyer)
        .map(|i| &i.value)
}

#[tokio::test]
async fn test_set_buyer_offer_without_sell_intention() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    drive_to_standard_hold(owner).await;
    set_test_time(10);
    set_test_caller(buyer);

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let referral = None;
    let price = HT_MIN_PRICE;

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    result_err_matches!(result, SetBuyerOfferError::HolderWrongState);
}

#[tokio::test]
async fn test_set_buyer_offer_wrong_referral() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    drive_to_standard_hold(owner).await;
    ht_set_sale_intentions(owner).await;
    assert!(set_sale_offer_int(2 * HT_MIN_PRICE).await.is_ok());

    set_test_time(10);
    set_test_caller(buyer);

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let max_referral_length = get_env().get_settings().max_referral_length;
    let referral = Some("_".repeat(max_referral_length + 1).to_owned());
    let price = HT_MIN_PRICE;

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    result_err_matches!(result, SetBuyerOfferError::InvalidReferral);
}

#[tokio::test]
async fn test_set_buyer_offer_wrong_price() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    drive_to_standard_hold(owner).await;
    ht_set_sale_intentions(owner).await;
    assert!(set_sale_offer_int(2 * HT_MIN_PRICE).await.is_ok());

    set_test_time(10);
    set_test_caller(buyer);

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let max_referral_length = get_env().get_settings().max_referral_length;
    let referral = Some("_".repeat(max_referral_length).to_owned());
    let price = HT_MIN_PRICE - 1;

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    result_err_matches!(
        result,
        SetBuyerOfferError::OfferAmountTooLow {
            min_sell_price_inclusively: HT_MIN_PRICE
        }
    );
}

#[tokio::test]
async fn test_set_buyer_offer_invalid_approved_account() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 2 * HT_MIN_PRICE).await;

    set_test_caller(buyer);

    ht_set_cycles_above_critical_threshold();

    let approved_account = LedgerAccount::Account {
        owner: buyer,
        subaccount: Some(vec![1]),
    };
    let referral = None;
    let price = HT_MIN_PRICE;

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    result_err_matches!(
        result,
        SetBuyerOfferError::CheckApprovedBalanceError {
            error: CheckApprovedBalanceError::InvalidApprovedAccount { .. }
        }
    );

    let approved_account = LedgerAccount::AccountIdentifier {
        slice: Principal::management_canister().as_slice().to_vec(),
    };
    let result = set_buyer_offer_int(approved_account, None, price).await;
    result_err_matches!(
        result,
        SetBuyerOfferError::CheckApprovedBalanceError {
            error: CheckApprovedBalanceError::InvalidApprovedAccount { .. }
        }
    );
}

#[tokio::test]
async fn test_set_buyer_offer_low_balance() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 2 * HT_MIN_PRICE).await;

    set_test_caller(buyer);

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let referral = None;
    let price = HT_MIN_PRICE;

    let approved_account_identifier = to_account_identifier(&approved_account).unwrap();
    ht_deposit_account(&approved_account_identifier, price - 1);

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    result_err_matches!(
        result,
        SetBuyerOfferError::CheckApprovedBalanceError {
            error: CheckApprovedBalanceError::InsufficientBalance
        }
    );
}

#[tokio::test]
async fn test_set_buyer_offer_low_allowance() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 2 * HT_MIN_PRICE).await;

    set_test_caller(buyer);

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let referral = None;
    let price = HT_MIN_PRICE;

    let approved_account_identifier = to_account_identifier(&approved_account).unwrap();
    let approved_account_hex = approved_account_identifier.to_hex();
    let expires_at = get_holder_model(|_, model| model.sale_deal.as_ref().unwrap().expiration_time);
    ht_approve_account(approved_account_hex.clone(), expires_at, price - 1);
    ht_deposit_account(&approved_account_identifier, price);

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    println!("Result: {:?}", result);
    result_err_matches!(
        result,
        SetBuyerOfferError::CheckApprovedBalanceError {
            error: CheckApprovedBalanceError::InsufficientAllowance
        }
    );
}

#[tokio::test]
async fn test_set_buyer_offer_allowance_expired() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 2 * HT_MIN_PRICE).await;

    set_test_caller(buyer);

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let referral = None;
    let price = HT_MIN_PRICE;

    let approved_account_identifier = to_account_identifier(&approved_account).unwrap();
    let approved_account_hex = approved_account_identifier.to_hex();
    let expires_at =
        get_holder_model(|_, model| model.sale_deal.as_ref().unwrap().expiration_time - 1);
    ht_approve_account(approved_account_hex.clone(), expires_at, price);
    ht_deposit_account(&approved_account_identifier, price);

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    result_err_matches!(
        result,
        SetBuyerOfferError::CheckApprovedBalanceError {
            error: CheckApprovedBalanceError::AllowanceExpiresTooEarly
        }
    );
}

#[tokio::test]
async fn test_set_buyer_offer_impossible_for_owner() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    drive_to_standard_hold(owner).await;
    ht_set_sale_intentions(owner).await;
    assert!(set_sale_offer_int(2 * HT_MIN_PRICE).await.is_ok());

    set_test_time(10);
    set_test_caller(owner);

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let referral = None;
    let price = HT_MIN_PRICE;

    ht_fund_approved_account(&approved_account, price);

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    result_err_matches!(result, SetBuyerOfferError::HolderWrongState);
}

#[tokio::test]
async fn test_set_buyer_offer_impossible_while_quarantine() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    drive_to_standard_hold(owner).await;
    ht_set_sale_intentions(owner).await;
    assert!(set_sale_offer_int(2 * HT_MIN_PRICE).await.is_ok());

    set_test_time(10);
    set_test_caller(buyer);

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let referral = None;
    let price = HT_MIN_PRICE;

    ht_fund_approved_account(&approved_account, price);

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    result_err_matches!(result, SetBuyerOfferError::HolderWrongState);
}

#[tokio::test]
async fn test_set_buyer_offer_sellable_expired() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 2 * HT_MIN_PRICE).await;

    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);
    set_test_caller(buyer);

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let referral = None;
    let price = HT_MIN_PRICE;

    ht_fund_approved_account(&approved_account, price);

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    result_err_matches!(result, SetBuyerOfferError::HolderWrongState);
}

#[tokio::test]
async fn test_set_buyer_offer_not_sell_offer() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    drive_to_standard_hold(owner).await;
    ht_set_sale_intentions(owner).await;

    // END OF QUARANTINE
    ht_end_quarantine().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::WaitingSellOffer)
        }
    });

    set_test_caller(buyer);
    ht_set_cycles_above_critical_threshold();

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let max_referral_length = get_env().get_settings().max_referral_length;
    let referral = Some("_".repeat(max_referral_length).to_owned());
    let price = HT_MIN_PRICE;

    ht_fund_approved_account(&approved_account, price);

    let result = set_buyer_offer_int(approved_account, referral, price).await;
    result_err_matches!(result, SetBuyerOfferError::HolderWrongState);
}

#[tokio::test]
async fn test_set_buyer_offer_success() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 2 * HT_MIN_PRICE).await;

    set_test_caller(buyer);
    ht_set_cycles_above_critical_threshold();

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let max_referral_length = get_env().get_settings().max_referral_length;
    let referral = Some("_".repeat(max_referral_length).to_owned());
    let price = HT_MIN_PRICE;

    ht_fund_approved_account(&approved_account, price);

    let result = set_buyer_offer_int(approved_account.clone(), referral.clone(), price).await;
    let holder_information = result_ok_with_holder_information!(result);
    let offer = ht_find_offer_by_buyer(&holder_information, &buyer).unwrap();
    assert_eq!(offer.buyer, buyer);
    assert_eq!(offer.offer_amount, HT_MIN_PRICE);
    assert_eq!(offer.approved_account, approved_account);
    assert_eq!(offer.referral, referral);
}

#[tokio::test]
async fn test_rotation_buyer_offers() {
    let owner = ht_get_test_deployer();
    let buyer1 = ht_get_test_hub_canister();
    let buyer2 = ht_get_test_contract_canister();
    let buyer3 = Principal::management_canister();

    ht_drive_to_trading(owner, 10 * HT_MIN_PRICE).await;

    let check_offers_len = |holder_information: &HolderInformation, expected_len: usize| {
        assert_eq!(
            holder_information.sale_deal.as_ref().unwrap().offers.len(),
            expected_len
        );
    };

    let holder_information = ht_set_buyer_offer(&buyer1, 3 * HT_MIN_PRICE, None).await;
    check_offers_len(&holder_information, 1);
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer1).is_some());

    let holder_information = ht_set_buyer_offer(&buyer2, 2 * HT_MIN_PRICE, None).await;
    check_offers_len(&holder_information, 2);
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer1).is_some());
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer2).is_some());

    let holder_information = ht_set_buyer_offer(&buyer3, HT_MIN_PRICE, None).await;
    check_offers_len(&holder_information, 2);
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer1).is_some());
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer2).is_none());
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer3).is_some());

    let holder_information = ht_set_buyer_offer(&buyer2, HT_MIN_PRICE, None).await;
    check_offers_len(&holder_information, 2);
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer1).is_some());
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer2).is_some());
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer3).is_none());

    let holder_information = ht_set_buyer_offer(&buyer1, HT_MIN_PRICE, None).await;
    check_offers_len(&holder_information, 2);
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer1).is_some());
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer2).is_some());
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer3).is_none());

    let holder_information = ht_set_buyer_offer(&buyer3, HT_MIN_PRICE, None).await;
    check_offers_len(&holder_information, 2);
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer1).is_some());
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer2).is_none());
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer3).is_some());
}

pub(crate) fn ht_get_buyer_approved_account(buyer: &Principal) -> LedgerAccount {
    LedgerAccount::Account {
        owner: *buyer,
        subaccount: None,
    }
}

pub(crate) async fn ht_set_buyer_offer(
    buyer: &Principal,
    offer_amount: TokenE8s,
    referral: Option<String>,
) -> HolderInformation {
    set_test_caller(*buyer);
    let approved_account = ht_get_buyer_approved_account(buyer);
    let approved_account_identifier = to_account_identifier(&approved_account).unwrap();
    let approved_account_hex = approved_account_identifier.to_hex();
    let expires_at = get_holder_model(|_, model| model.sale_deal.as_ref().unwrap().expiration_time);
    ht_approve_account(approved_account_hex.clone(), expires_at, offer_amount);

    ht_deposit_account(&approved_account_identifier, offer_amount);

    let result =
        set_buyer_offer_int(approved_account.clone(), referral.clone(), offer_amount).await;
    let holder_information = result_ok_with_holder_information!(result);

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    let offer = ht_find_offer_by_buyer(&holder_information, &buyer).unwrap();
    assert_eq!(offer.buyer, *buyer);
    assert_eq!(offer.offer_amount, offer_amount);
    assert_eq!(offer.approved_account, approved_account);

    holder_information
}

#[tokio::test]
async fn test_cancel_buyer_offer() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 3 * HT_MIN_PRICE).await;

    // FAIL CANCEL NOT EXISTS OFFER
    set_test_caller(buyer);
    let result = cancel_buyer_offer_int().await;
    result_err_matches!(result, CancelBuyerOfferError::NoBuyerOffer);

    // SET BUYER OFFER
    let buyer_offer_amount = 2 * HT_MIN_PRICE;
    let holder_information = ht_set_buyer_offer(&buyer, buyer_offer_amount, None).await;
    let approved_account = ht_get_buyer_approved_account(&buyer);
    assert_eq!(
        ht_get_account_balance(to_account_identifier(&approved_account).unwrap().to_hex()),
        buyer_offer_amount
    );

    let offer = ht_find_offer_by_buyer(&holder_information, &buyer).unwrap();
    assert_eq!(offer.offer_amount, buyer_offer_amount);

    // CANCEL BUYER OFFER
    set_test_caller(buyer);
    let holder_information = result_ok_with_holder_information!(cancel_buyer_offer_int().await);
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer).is_none());
    assert_eq!(
        ht_get_account_balance(to_account_identifier(&approved_account).unwrap().to_hex()),
        buyer_offer_amount
    );
}

#[tokio::test]
async fn test_set_seller_offer_fail_when_existing_buyer_offer() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 3 * HT_MIN_PRICE).await;

    set_test_caller(buyer);

    let approved_account = ht_get_buyer_approved_account(&buyer);
    let max_referral_length = get_env().get_settings().max_referral_length;
    let referral = Some("_".repeat(max_referral_length).to_owned());
    let price = 2 * HT_MIN_PRICE;

    ht_fund_approved_account(&approved_account, price);

    let result = set_buyer_offer_int(approved_account.clone(), referral.clone(), price).await;
    let holder_information = result_ok_with_holder_information!(result);
    let offer = ht_find_offer_by_buyer(&holder_information, &buyer).unwrap();
    assert_eq!(offer.buyer, buyer);
    assert_eq!(offer.offer_amount, price);
    assert_eq!(offer.approved_account, approved_account);
    assert_eq!(offer.referral, referral);

    set_test_caller(owner);
    let result = set_sale_offer_int(price - 1).await;
    result_err_matches!(result, SetSaleOfferError::HigherBuyerOfferExists);

    let result = set_sale_offer_int(price).await;
    result_err_matches!(result, SetSaleOfferError::HigherBuyerOfferExists);

    let result = set_sale_offer_int(price + 1).await;
    result_ok_with_holder_information!(result);
}

#[tokio::test]
async fn test_accept_buyer_offer() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 3 * HT_MIN_PRICE).await;

    // SET BUYER OFFER
    let buyer_offer_amount = 2 * HT_MIN_PRICE;
    ht_set_buyer_offer(&buyer, buyer_offer_amount, Some("one_percent".to_owned())).await;
    let approved_account = ht_get_buyer_approved_account(&buyer);
    assert_eq!(
        ht_get_account_balance(to_account_identifier(&approved_account).unwrap().to_hex()),
        buyer_offer_amount
    );

    // FAIL PERMISSION
    set_test_caller(buyer);
    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer,
        offer_amount: 12,
        check_higher_offer: true,
    })
    .await;
    result_err_matches!(result, AcceptBuyerOfferError::PermissionDenied);

    // FAIL ACCEPT OTHER BUYER
    set_test_caller(owner);
    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer: owner,
        offer_amount: 12,
        check_higher_offer: true,
    })
    .await;
    result_err_matches!(result, AcceptBuyerOfferError::OfferNotFound);

    // FAIL ACCEPT WRONG OFFER AMOUNT
    set_test_caller(owner);
    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer,
        offer_amount: 12,
        check_higher_offer: true,
    })
    .await;
    result_err_matches!(result, AcceptBuyerOfferError::OfferMismatch);

    // FAIL ACCEPT CRITICAL_CYCLES_LEVEL
    let threshold = ht_get_critical_cycles_threshold();
    use crate::test::tests::components::ic::ht_set_test_cycles;
    ht_set_test_cycles(threshold);
    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer,
        offer_amount: buyer_offer_amount,
        check_higher_offer: true,
    })
    .await;
    result_err_matches!(
        result,
        AcceptBuyerOfferError::CriticalCyclesLevel {
            critical_threshold_cycles
        } if critical_threshold_cycles == threshold
    );

    // ACCEPT BUYER OFFER SUCCESS
    ht_set_cycles_above_critical_threshold();

    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer,
        offer_amount: buyer_offer_amount,
        check_higher_offer: true,
    })
    .await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        buyer_offer_amount
    );

    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::StartAccept
                })
            }
        } if accept_buyer == &buyer);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToTransitAccount
                })
            }
        } if accept_buyer == &buyer);

    set_test_caller(owner);
    let result = start_release_identity_int().await;
    result_err_matches!(result, StartReleaseIdentityError::HolderWrongState);
}

#[tokio::test]
async fn test_accept_failed_buyer_offer() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 3 * HT_MIN_PRICE).await;

    // SET BUYER OFFER
    let buyer_offer_amount = 2 * HT_MIN_PRICE;
    ht_set_buyer_offer(&buyer, buyer_offer_amount, Some("one_percent".to_owned())).await;
    let approved_account = ht_get_buyer_approved_account(&buyer);
    let approved_account_identifier = to_account_identifier(&approved_account).unwrap();
    assert_eq!(
        ht_get_account_balance(approved_account_identifier.to_hex()),
        buyer_offer_amount
    );

    ht_set_cycles_above_critical_threshold();

    // set less balance
    let _r = ht_withdraw_from_account(approved_account_identifier.to_hex(), 1).unwrap();

    set_test_caller(owner);
    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer,
        offer_amount: buyer_offer_amount,
        check_higher_offer: true,
    })
    .await;
    result_err_matches!(result, AcceptBuyerOfferError::OfferRemoved);
    get_holder_model(|_, model| {
        assert!(get_buyer_offer(model, &buyer).is_none());
    });
}

#[tokio::test]
async fn test_accept_buyer_offer_expiration_failed() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 3 * HT_MIN_PRICE).await;

    // SET BUYER OFFER
    let buyer_offer_amount = 2 * HT_MIN_PRICE;
    ht_set_buyer_offer(&buyer, buyer_offer_amount, Some("one_percent".to_owned())).await;
    let approved_account = ht_get_buyer_approved_account(&buyer);
    assert_eq!(
        ht_get_account_balance(to_account_identifier(&approved_account).unwrap().to_hex()),
        buyer_offer_amount
    );

    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);
    set_test_caller(owner);

    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer,
        offer_amount: buyer_offer_amount,
        check_higher_offer: true,
    })
    .await;
    result_err_matches!(result, AcceptBuyerOfferError::HolderWrongState);
}

#[tokio::test]
async fn test_set_sale_offer_with_accept() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    ht_drive_to_trading(owner, 3 * HT_MIN_PRICE).await;

    // SET BUYER OFFER
    let buyer_offer_amount = 2 * HT_MIN_PRICE;
    ht_set_buyer_offer(&buyer, buyer_offer_amount, Some("one_percent".to_owned())).await;
    let approved_account = ht_get_buyer_approved_account(&buyer);
    assert_eq!(
        ht_get_account_balance(to_account_identifier(&approved_account).unwrap().to_hex()),
        buyer_offer_amount
    );

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    // ACCEPT BUYER OFFER
    set_test_caller(owner);
    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer,
        offer_amount: buyer_offer_amount,
        check_higher_offer: true,
    })
    .await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        buyer_offer_amount
    );

    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::StartAccept
                })
            }
        } if accept_buyer == &buyer);

    set_test_caller(owner);
    let result = start_release_identity_int().await;
    result_err_matches!(result, StartReleaseIdentityError::HolderWrongState);
}

#[tokio::test]
async fn test_fail_accept_sale_deal_by_buyer() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();

    let sale_offer = 3 * HT_MIN_PRICE;
    ht_drive_to_trading(owner, sale_offer).await;

    // SET BUYER OFFER
    let buyer_offer_amount = 2 * HT_MIN_PRICE;
    let referral = Some("one_percent".to_owned());
    ht_set_buyer_offer(&buyer, buyer_offer_amount, referral.clone()).await;
    let approved_account = ht_get_buyer_approved_account(&buyer);
    assert_eq!(
        ht_get_account_balance(to_account_identifier(&approved_account).unwrap().to_hex()),
        buyer_offer_amount
    );

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    // UP BUYER OFFER
    set_test_caller(buyer);
    let new_buyer_offer_amount = sale_offer - 1;
    let approved_account = ht_get_buyer_approved_account(&buyer);
    let approved_account_identifier = to_account_identifier(&approved_account).unwrap();
    let approved_account_hex = approved_account_identifier.to_hex();
    let expires_at = get_holder_model(|_, model| model.sale_deal.as_ref().unwrap().expiration_time);
    ht_approve_account(
        approved_account_hex.clone(),
        expires_at,
        new_buyer_offer_amount,
    );
    ht_deposit_account(
        &approved_account_identifier,
        new_buyer_offer_amount - buyer_offer_amount,
    );
    let result = set_buyer_offer_int(
        approved_account.clone(),
        referral.clone(),
        new_buyer_offer_amount,
    )
    .await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        sale_offer
    );
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    let offer = ht_find_offer_by_buyer(&holder_information, &buyer).unwrap();
    assert_eq!(offer.buyer, buyer);
    assert_eq!(offer.offer_amount, new_buyer_offer_amount);
    assert_eq!(offer.approved_account, approved_account);
    assert_eq!(offer.referral, referral);

    assert_eq!(
        ht_get_account_balance(to_account_identifier(&approved_account).unwrap().to_hex()),
        new_buyer_offer_amount
    );

    // UP BUYER OFFER TO FAIL
    set_test_caller(buyer);
    let buyer_offer_amount = new_buyer_offer_amount;
    let new_buyer_offer_amount = sale_offer;
    let approved_account = ht_get_buyer_approved_account(&buyer);
    let approved_account_identifier = to_account_identifier(&approved_account).unwrap();
    let approved_account_hex = approved_account_identifier.to_hex();
    let expires_at = get_holder_model(|_, model| model.sale_deal.as_ref().unwrap().expiration_time);
    ht_approve_account(
        approved_account_hex.clone(),
        expires_at,
        new_buyer_offer_amount,
    );
    ht_deposit_account(
        &approved_account_identifier,
        new_buyer_offer_amount - buyer_offer_amount,
    );
    let result = set_buyer_offer_int(
        approved_account.clone(),
        referral.clone(),
        new_buyer_offer_amount,
    )
    .await;
    result_err_matches!(result, SetBuyerOfferError::OfferAmountExceedsPrice);
}

#[tokio::test]
async fn test_cancel_not_accepted_sale_deal_by_seller() {
    let owner = ht_get_test_deployer();
    let buyer1 = ht_get_test_hub_canister();
    let buyer2 = ht_get_test_contract_canister();

    ht_drive_to_trading(owner, 3 * HT_MIN_PRICE).await;

    // SET BUYER1 OFFER
    let buyer1_offer_amount = 2 * HT_MIN_PRICE;
    let buyer1_aid = to_account_identifier(&ht_get_buyer_approved_account(&buyer1)).unwrap();
    ht_set_buyer_offer(&buyer1, buyer1_offer_amount, Some("one_percent".to_owned())).await;

    // SET BUYER2 OFFER
    let buyer2_offer_amount = HT_MIN_PRICE;
    let buyer2_aid = to_account_identifier(&ht_get_buyer_approved_account(&buyer2)).unwrap();
    ht_set_buyer_offer(&buyer2, buyer2_offer_amount, Some("one_percent".to_owned())).await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    assert_eq!(
        ht_get_account_balance(buyer1_aid.to_hex()),
        buyer1_offer_amount
    );
    assert_eq!(
        ht_get_account_balance(buyer2_aid.to_hex()),
        buyer2_offer_amount
    );

    let transit_sub_account = get_sale_deal_transit_sub_account(&owner);
    let transit_account = get_env()
        .get_ledger()
        .get_canister_account(&transit_sub_account);
    assert_eq!(ht_get_account_balance(transit_account.to_hex()), 0);

    // TEST CHECK PERMISSION
    set_test_caller(buyer1);
    let result = cancel_sale_intention_int().await;
    result_err_matches!(result, CancelSaleIntentionError::PermissionDenied);

    // TEST OK
    set_test_caller(owner);
    let result = cancel_sale_intention_int().await;
    result_ok_with_holder_information!(result);

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: None,
        }
    });
    get_holder_model(|_, model| {
        assert!(model.sale_deal.is_none());
    });
    assert_eq!(
        ht_get_account_balance(buyer1_aid.to_hex()),
        buyer1_offer_amount
    );
    assert_eq!(
        ht_get_account_balance(buyer2_aid.to_hex()),
        buyer2_offer_amount
    );
    assert_eq!(ht_get_account_balance(transit_account.to_hex()), 0);
}

#[tokio::test]
async fn test_complete_sale_deal_with_referral() {
    let owner = ht_get_test_deployer();
    let buyer1 = ht_get_test_hub_canister();
    let buyer2 = ht_get_test_contract_canister();

    ht_drive_to_trading(owner, 4 * HT_MIN_PRICE).await;

    // SET BUYER1 OFFER
    let buyer1_offer_amount = HT_MIN_PRICE;
    let buyer1_aid = to_account_identifier(&ht_get_buyer_approved_account(&buyer1)).unwrap();
    ht_set_buyer_offer(&buyer1, buyer1_offer_amount, Some("one_percent".to_owned())).await;

    // SET BUYER2 OFFER
    let buyer2_offer_amount = 3 * HT_MIN_PRICE;
    let buyer2_aid = to_account_identifier(&ht_get_buyer_approved_account(&buyer2)).unwrap();
    ht_set_buyer_offer(&buyer2, buyer2_offer_amount, Some("one_percent".to_owned())).await;

    // SET SALE OFFER DOWN
    set_test_caller(owner);
    let sale_price = buyer2_offer_amount;
    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer: buyer2,
        offer_amount: buyer2_offer_amount,
        check_higher_offer: true,
    })
    .await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        sale_price
    );
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().offers.len(),
        2
    );
    let offer1 = ht_find_offer_by_buyer(&holder_information, &buyer1).unwrap();
    assert_eq!(offer1.buyer, buyer1);
    assert_eq!(offer1.offer_amount, buyer1_offer_amount);

    let offer2 = ht_find_offer_by_buyer(&holder_information, &buyer2).unwrap();
    assert_eq!(offer2.buyer, buyer2);
    assert_eq!(offer2.offer_amount, sale_price);

    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::StartAccept
                })
            }
        } if accept_buyer == &buyer2);

    assert_eq!(
        ht_get_account_balance(buyer1_aid.to_hex()),
        buyer1_offer_amount
    );
    assert_eq!(
        ht_get_account_balance(buyer2_aid.to_hex()),
        buyer2_offer_amount
    );

    let transit_sub_account = get_sale_deal_transit_sub_account(&owner);
    let transit_account = get_env()
        .get_ledger()
        .get_canister_account(&transit_sub_account);
    assert_eq!(ht_get_account_balance(transit_account.to_hex()), 0);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToTransitAccount
                })
            }
        } if accept_buyer == &buyer2);

    set_test_caller(owner);
    let result = start_release_identity_int().await;
    result_err_matches!(result, StartReleaseIdentityError::HolderWrongState);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::ResolveReferralRewardData
                })
            }
        } if accept_buyer == &buyer2);

    let holder_information = build_holder_information_with_load();
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().offers.len(),
        1
    );
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer1).is_none());

    let offer2 = ht_find_offer_by_buyer(&holder_information, &buyer2).unwrap();
    assert_eq!(offer2.buyer, buyer2);
    assert_eq!(offer2.offer_amount, sale_price);

    assert_eq!(
        ht_get_account_balance(buyer1_aid.to_hex()),
        buyer1_offer_amount
    );
    assert_eq!(ht_get_account_balance(buyer2_aid.to_hex()), 0);

    assert_eq!(
        ht_get_account_balance(transit_account.to_hex()),
        sale_price - HT_LEDGER_FEE
    );

    // RESOLVE REFERRAL REWARD DATA
    let referral_account = ht_get_referral_account();
    let referral_amount = get_permyriad(
        sale_price,
        get_env().get_settings().referral_reward_permyriad,
    )
    .unwrap();

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferReferralReward { reward_data: Some(ReferralRewardData {
                         account, memo
                    })  }
                })
            }
        } if accept_buyer == &buyer2
        && account == &referral_account
        && memo == &1
    );

    // TRANSFER REFERRAL REWARD

    assert_eq!(
        ht_get_account_balance(to_account_identifier(&referral_account).unwrap().to_hex()),
        0
    );
    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferDeveloperReward
                })
            }
        } if accept_buyer == &buyer2);
    assert_eq!(
        ht_get_account_balance(to_account_identifier(&referral_account).unwrap().to_hex()),
        referral_amount
    );
    assert_eq!(
        ht_get_account_balance(transit_account.to_hex()),
        sale_price - referral_amount - 2 * HT_LEDGER_FEE
    );

    set_test_caller(owner);
    let result = start_release_identity_int().await;
    result_err_matches!(result, StartReleaseIdentityError::HolderWrongState);

    // TRANSFER DEVELOPER REWARD

    let developer_account = get_env().get_settings().developer_reward_account.clone();
    let developer_amount = get_permyriad(
        sale_price,
        get_env().get_settings().developer_reward_permyriad,
    )
    .unwrap();

    assert_eq!(ht_get_account_balance(developer_account.to_hex()), 0);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferHubReward
                })
            }
        } if accept_buyer == &buyer2);
    assert_eq!(
        ht_get_account_balance(developer_account.to_hex()),
        developer_amount
    );
    assert_eq!(
        ht_get_account_balance(transit_account.to_hex()),
        sale_price - referral_amount - developer_amount - 3 * HT_LEDGER_FEE
    );

    // TRANSFER HUB REWARD

    let hub_account = get_env().get_settings().hub_reward_account.clone();
    let hub_amount = get_permyriad(sale_price, get_env().get_settings().hub_reward_permyriad)
        .unwrap()
        - 5 * HT_LEDGER_FEE;

    assert_eq!(ht_get_account_balance(hub_account.to_hex()), 0);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToSellerAccount
                })
            }
        } if accept_buyer == &buyer2);
    assert_eq!(ht_get_account_balance(hub_account.to_hex()), hub_amount);
    assert_eq!(
        ht_get_account_balance(transit_account.to_hex()),
        sale_price
            - HT_LEDGER_FEE
            - referral_amount
            - HT_LEDGER_FEE
            - developer_amount
            - HT_LEDGER_FEE
            - hub_amount
            - HT_LEDGER_FEE
    );

    get_holder_model(|_, model| assert!(model.completed_sale_deal.is_none()));

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::SaleDealCompleted
        }
    });

    let sell_receive_amount = sale_price
        - get_permyriad(
            sale_price,
            get_env().get_settings().referral_reward_permyriad,
        )
        .unwrap()
        - get_permyriad(
            sale_price,
            get_env().get_settings().developer_reward_permyriad,
        )
        .unwrap()
        - get_permyriad(sale_price, get_env().get_settings().hub_reward_permyriad).unwrap();

    get_holder_model(|_, model| {
        let cm = model.completed_sale_deal.as_ref().unwrap();
        assert_eq!(cm.assets.value, model.assets.as_ref().unwrap().value);
        assert_eq!(cm.buyer, buyer2);
        assert_eq!(cm.seller, owner);
        assert_eq!(cm.price, sale_price);
        assert_eq!(cm.buyer_account, ht_get_buyer_approved_account(&buyer2));
        assert_eq!(
            cm.seller_account,
            LedgerAccount::Account {
                owner,
                subaccount: None,
            }
        );
        assert_eq!(cm.seller_transfer.value, sell_receive_amount);
    });

    assert_eq!(
        ht_get_account_balance(
            to_account_identifier(&LedgerAccount::Account {
                owner,
                subaccount: None,
            })
            .unwrap()
            .to_hex()
        ),
        sell_receive_amount
    );
    assert_eq!(ht_get_account_balance(transit_account.to_hex()), 0);
}

#[tokio::test]
async fn test_complete_sale_deal_after_buyer_set_offer() {
    let owner = ht_get_test_deployer();
    let buyer1 = ht_get_test_hub_canister();
    let buyer2 = ht_get_test_contract_canister();

    let sale_offer = 2 * HT_MIN_PRICE;
    ht_drive_to_trading(owner, sale_offer).await;

    // SET BUYER1 OFFER
    let buyer1_offer_amount = HT_MIN_PRICE;
    let buyer1_aid = to_account_identifier(&ht_get_buyer_approved_account(&buyer1)).unwrap();
    ht_set_buyer_offer(&buyer1, buyer1_offer_amount, Some("one_percent".to_owned())).await;

    // SET BUYER2 OFFER
    let buyer2_offer_amount = 3 * HT_MIN_PRICE;
    set_test_caller(buyer2);
    let approved_account2 = ht_get_buyer_approved_account(&buyer2);
    let buyer2_aid = to_account_identifier(&approved_account2).unwrap();
    let approved_account2_hex = buyer2_aid.to_hex();
    let expires_at = get_holder_model(|_, model| model.sale_deal.as_ref().unwrap().expiration_time);
    ht_approve_account(
        approved_account2_hex.clone(),
        expires_at,
        buyer2_offer_amount,
    );
    ht_deposit_account(&buyer2_aid, buyer2_offer_amount);

    let result = accept_seller_offer_int(approved_account2.clone(), None, sale_offer + 1).await;
    result_err_matches!(result, AcceptSellerOfferError::PriceMismatch);

    let result = accept_seller_offer_int(approved_account2.clone(), None, sale_offer).await;
    let holder_information = result_ok_with_holder_information!(result);

    let sale_price = sale_offer;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::StartAccept
                })
            }
        } if accept_buyer == &buyer2);
    let offer = ht_find_offer_by_buyer(&holder_information, &buyer2).unwrap();
    assert_eq!(offer.buyer, buyer2);
    assert_eq!(offer.offer_amount, sale_price);
    assert_eq!(offer.approved_account, approved_account2);
    assert_eq!(offer.referral, None);

    assert_eq!(
        ht_get_account_balance(buyer1_aid.to_hex()),
        buyer1_offer_amount
    );
    assert_eq!(
        ht_get_account_balance(buyer2_aid.to_hex()),
        buyer2_offer_amount
    );

    let transit_sub_account = get_sale_deal_transit_sub_account(&owner);
    let transit_account = get_env()
        .get_ledger()
        .get_canister_account(&transit_sub_account);
    assert_eq!(ht_get_account_balance(transit_account.to_hex()), 0);

    set_test_caller(owner);
    let result = start_release_identity_int().await;
    result_err_matches!(result, StartReleaseIdentityError::HolderWrongState);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToTransitAccount
                })
            }
        } if accept_buyer == &buyer2);

    super::tick().await;

    let referral_account = get_env()
        .get_settings()
        .referral_reward_fallback_account
        .clone();

    let referral_amount = get_permyriad(
        sale_price,
        get_env().get_settings().referral_reward_permyriad,
    )
    .unwrap();
    // get_holder_model(|_, model| {
    // println!(">>>{:?}", model.state.value);
    // });

    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferReferralReward { reward_data: None  }
                })
            }
        } if accept_buyer == &buyer2);

    let holder_information = build_holder_information_with_load();
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().offers.len(),
        1
    );
    assert!(ht_find_offer_by_buyer(&holder_information, &buyer1).is_none());

    let offer2 = ht_find_offer_by_buyer(&holder_information, &buyer2).unwrap();
    assert_eq!(offer2.buyer, buyer2);
    assert_eq!(offer2.offer_amount, sale_price);

    assert_eq!(
        ht_get_account_balance(buyer1_aid.to_hex()),
        buyer1_offer_amount
    );
    assert_eq!(
        ht_get_account_balance(buyer2_aid.to_hex()),
        buyer2_offer_amount - sale_price
    );

    assert_eq!(
        ht_get_account_balance(transit_account.to_hex()),
        sale_price - HT_LEDGER_FEE
    );

    // TRANSFER REFERRAL REWARD

    assert_eq!(ht_get_account_balance(referral_account.to_hex()), 0);
    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferDeveloperReward
                })
            }
        } if accept_buyer == &buyer2);
    assert_eq!(
        ht_get_account_balance(referral_account.to_hex()),
        referral_amount
    );
    assert_eq!(
        ht_get_account_balance(transit_account.to_hex()),
        sale_price - referral_amount - 2 * HT_LEDGER_FEE
    );

    // TRANSFER DEVELOPER REWARD

    let developer_account = get_env().get_settings().developer_reward_account.clone();
    let developer_amount = get_permyriad(
        sale_price,
        get_env().get_settings().developer_reward_permyriad,
    )
    .unwrap();

    assert_eq!(ht_get_account_balance(developer_account.to_hex()), 0);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferHubReward
                })
            }
        } if accept_buyer == &buyer2);
    assert_eq!(
        ht_get_account_balance(developer_account.to_hex()),
        developer_amount
    );
    assert_eq!(
        ht_get_account_balance(transit_account.to_hex()),
        sale_price - referral_amount - developer_amount - 3 * HT_LEDGER_FEE
    );

    // TRANSFER HUB REWARD

    let hub_account = get_env().get_settings().hub_reward_account.clone();
    let hub_amount = get_permyriad(sale_price, get_env().get_settings().hub_reward_permyriad)
        .unwrap()
        - 5 * HT_LEDGER_FEE;

    assert_eq!(ht_get_account_balance(hub_account.to_hex()), 0);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToSellerAccount
                })
            }
        } if accept_buyer == &buyer2);
    assert_eq!(ht_get_account_balance(hub_account.to_hex()), hub_amount);
    assert_eq!(
        ht_get_account_balance(transit_account.to_hex()),
        sale_price
            - HT_LEDGER_FEE
            - referral_amount
            - HT_LEDGER_FEE
            - developer_amount
            - HT_LEDGER_FEE
            - hub_amount
            - HT_LEDGER_FEE
    );

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::SaleDealCompleted
        }
    });
    assert_eq!(
        ht_get_account_balance(
            to_account_identifier(&LedgerAccount::Account {
                owner,
                subaccount: None,
            })
            .unwrap()
            .to_hex()
        ),
        sale_price
            - get_permyriad(
                sale_price,
                get_env().get_settings().referral_reward_permyriad
            )
            .unwrap()
            - get_permyriad(
                sale_price,
                get_env().get_settings().developer_reward_permyriad
            )
            .unwrap()
            - get_permyriad(sale_price, get_env().get_settings().hub_reward_permyriad).unwrap()
    );
    assert_eq!(ht_get_account_balance(transit_account.to_hex()), 0);
}

#[tokio::test]
async fn test_accept_sale_deal_and_fail_transfer() {
    let owner = ht_get_test_deployer();
    let buyer1 = ht_get_test_hub_canister();
    let buyer2 = ht_get_test_contract_canister();

    ht_drive_to_trading(owner, 4 * HT_MIN_PRICE).await;

    // SET BUYER1 OFFER
    let buyer1_offer_amount = HT_MIN_PRICE;
    let buyer1_aid = to_account_identifier(&ht_get_buyer_approved_account(&buyer1)).unwrap();
    ht_set_buyer_offer(&buyer1, buyer1_offer_amount, Some("one_percent".to_owned())).await;

    // SET BUYER2 OFFER
    let buyer2_offer_amount = 3 * HT_MIN_PRICE;
    let buyer2_aid = to_account_identifier(&ht_get_buyer_approved_account(&buyer2)).unwrap();
    ht_set_buyer_offer(&buyer2, buyer2_offer_amount, Some("one_percent".to_owned())).await;

    // ACCEPT BUYER2 OFFER
    set_test_caller(owner);
    let sale_price = buyer2_offer_amount;
    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer: buyer2,
        offer_amount: buyer2_offer_amount,
        check_higher_offer: true,
    })
    .await;
    let holder_information = result_ok_with_holder_information!(result);

    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        sale_price
    );
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().offers.len(),
        2
    );
    let offer1 = ht_find_offer_by_buyer(&holder_information, &buyer1).unwrap();
    assert_eq!(offer1.buyer, buyer1);
    assert_eq!(offer1.offer_amount, buyer1_offer_amount);

    let offer2 = ht_find_offer_by_buyer(&holder_information, &buyer2).unwrap();
    assert_eq!(offer2.buyer, buyer2);
    assert_eq!(offer2.offer_amount, sale_price);

    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::StartAccept
                })
            }
        } if accept_buyer == &buyer2);

    assert_eq!(
        ht_get_account_balance(buyer1_aid.to_hex()),
        buyer1_offer_amount
    );
    assert_eq!(
        ht_get_account_balance(buyer2_aid.to_hex()),
        buyer2_offer_amount
    );

    let transit_sub_account = get_sale_deal_transit_sub_account(&owner);
    let transit_account = get_env()
        .get_ledger()
        .get_canister_account(&transit_sub_account);
    assert_eq!(ht_get_account_balance(transit_account.to_hex()), 0);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToTransitAccount
                })
            }
        } if accept_buyer == &buyer2);

    // SET LESS APPROVED AMOUNT TO FAIL TRANSFER
    let approved_account = ht_get_buyer_approved_account(&buyer2);
    let approved_account_identifier = to_account_identifier(&approved_account).unwrap();
    let expires_at = get_holder_model(|_, model| model.sale_deal.as_ref().unwrap().expiration_time);
    ht_approve_account(
        approved_account_identifier.to_hex(),
        expires_at,
        sale_price - 1,
    );

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    let holder_information = build_holder_information_with_load();
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().offers.len(),
        1
    );
    let offer1 = ht_find_offer_by_buyer(&holder_information, &buyer1).unwrap();
    assert_eq!(offer1.buyer, buyer1);
    assert_eq!(offer1.offer_amount, buyer1_offer_amount);

    assert_eq!(
        ht_get_account_balance(buyer1_aid.to_hex()),
        buyer1_offer_amount
    );
    assert_eq!(
        ht_get_account_balance(buyer2_aid.to_hex()),
        buyer2_offer_amount
    );

    assert_eq!(ht_get_account_balance(transit_account.to_hex()), 0);
}

#[tokio::test]
async fn test_sale_deal_set_buyer_offer_referral() {
    let owner = ht_get_test_deployer();
    let buyer1 = ht_get_test_hub_canister();
    let buyer2 = ht_get_test_contract_canister();

    ht_drive_to_trading(owner, 3 * HT_MIN_PRICE).await;

    // SET BUYER1 OFFER
    let buyer1_offer_amount = HT_MIN_PRICE;
    let holder_information = ht_set_buyer_offer(&buyer1, buyer1_offer_amount, None).await;
    let offer = ht_find_offer_by_buyer(&holder_information, &buyer1).unwrap();
    assert_eq!(offer.buyer, buyer1);
    assert_eq!(offer.referral, None);

    let holder_information =
        ht_set_buyer_offer(&buyer1, buyer1_offer_amount, Some("one_percent".to_owned())).await;
    let offer = ht_find_offer_by_buyer(&holder_information, &buyer1).unwrap();
    assert_eq!(offer.buyer, buyer1);
    assert_eq!(offer.referral, Some("one_percent".to_owned()));

    let buyer1_offer_amount = HT_MIN_PRICE;
    let holder_information = ht_set_buyer_offer(&buyer1, buyer1_offer_amount, None).await;
    let offer = ht_find_offer_by_buyer(&holder_information, &buyer1).unwrap();
    assert_eq!(offer.buyer, buyer1);
    assert_eq!(offer.referral, Some("one_percent".to_owned()));

    let buyer1_offer_amount = HT_MIN_PRICE;
    let holder_information = ht_set_buyer_offer(
        &buyer1,
        buyer1_offer_amount,
        Some("one_percent2".to_owned()),
    )
    .await;
    let offer = ht_find_offer_by_buyer(&holder_information, &buyer1).unwrap();
    assert_eq!(offer.buyer, buyer1);
    assert_eq!(offer.referral, Some("one_percent".to_owned()));

    // SET BUYER2 OFFER
    let buyer2_offer_amount = 2 * HT_MIN_PRICE;
    set_test_caller(buyer2);
    let approved_account2 = ht_get_buyer_approved_account(&buyer2);
    ht_fund_approved_account(&approved_account2, buyer2_offer_amount);
    let result = set_buyer_offer_int(approved_account2.clone(), None, buyer2_offer_amount).await;
    let holder_information = result_ok_with_holder_information!(result);
    let offer = ht_find_offer_by_buyer(&holder_information, &buyer2).unwrap();
    assert_eq!(offer.buyer, buyer2);
    assert_eq!(offer.referral, None);

    let result = set_buyer_offer_int(
        approved_account2.clone(),
        Some("two percent".to_string()),
        buyer2_offer_amount,
    )
    .await;
    let holder_information = result_ok_with_holder_information!(result);
    let offer = ht_find_offer_by_buyer(&holder_information, &buyer2).unwrap();
    assert_eq!(offer.buyer, buyer2);
    assert_eq!(offer.referral, Some("two percent".to_string()));

    let result = set_buyer_offer_int(approved_account2.clone(), None, buyer2_offer_amount).await;
    let holder_information = result_ok_with_holder_information!(result);
    let offer = ht_find_offer_by_buyer(&holder_information, &buyer2).unwrap();
    assert_eq!(offer.buyer, buyer2);
    assert_eq!(offer.referral, Some("two percent".to_string()));
}

#[tokio::test]
async fn test_accept_sale_deal_and_check_higher_offer() {
    let owner = ht_get_test_deployer();
    let buyer1 = ht_get_test_hub_canister();
    let buyer2 = ht_get_test_contract_canister();

    ht_drive_to_trading(owner, 4 * HT_MIN_PRICE).await;

    // SET BUYER1 OFFER
    let buyer1_offer_amount = HT_MIN_PRICE;
    ht_set_buyer_offer(&buyer1, buyer1_offer_amount, Some("one_percent".to_owned())).await;

    // SET BUYER2 OFFER
    let buyer2_offer_amount = HT_MIN_PRICE + 1;
    ht_set_buyer_offer(&buyer2, buyer2_offer_amount, Some("one_percent".to_owned())).await;

    // ACCEPT BUYER1 OFFER with fail check
    set_test_caller(owner);
    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer: buyer1,
        offer_amount: buyer1_offer_amount,
        check_higher_offer: true,
    })
    .await;
    result_err_matches!(result, AcceptBuyerOfferError::HigherBuyerOfferExists);

    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer: buyer1,
        offer_amount: buyer1_offer_amount,
        check_higher_offer: false,
    })
    .await;
    result_ok_with_holder_information!(result);
}
