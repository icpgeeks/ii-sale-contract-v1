use candid::Principal;
use common_canister_impl::components::{
    ledger::to_account_identifier,
    time::{Time, TimeImpl},
};
use common_canister_types::DelayedTimestampMillis;
use common_contract_api::add_contract_controller::{
    AddContractControllerArgs, AddContractControllerError,
};
use contract_canister_api::{
    accept_buyer_offer::AcceptBuyerOfferArgs,
    types::holder::{
        CancelSaleDealState, HolderState, HoldingState, SaleDealAcceptSubState, SaleDealState,
        UnsellableReason,
    },
};

use crate::{
    get_env,
    handlers::holder::states::get_holder_model,
    model::holder::UpgradeContractState,
    result_err_matches, result_ok_with_holder_information,
    test::tests::{
        activate_contract::ht_activate_contract,
        components::{
            ic::{ht_set_test_cycles, set_test_caller},
            ledger::{ht_get_account_balance, HT_LEDGER_FEE},
            time::set_test_time,
        },
        fetch_assets::ht_capture_identity_and_fetch_assets,
        ht_get_test_buyer, ht_get_test_deployer, ht_init_test_contract,
        sale::{
            ht_end_quarantine, ht_get_buyer_approved_account, ht_set_buyer_offer,
            ht_set_sale_intentions, ht_set_sale_offer,
        },
        HT_CAPTURED_IDENTITY_NUMBER, HT_MIN_PRICE, HT_SALE_DEAL_SAFE_CLOSE_DURATION,
    },
    test_state_matches,
    updates::{
        contract::add_contract_controller::add_contract_controller_int,
        holder::accept_buyer_offer::accept_buyer_offer_int,
    },
};

#[tokio::test]
async fn test_add_contract_controller() {
    let contract_owner = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
    let new_controller = Principal::from_text("xon54-haaaa-aaaak-quewq-cai").unwrap();

    let certificate_expiration = TimeImpl {}.get_current_unix_epoch_time_millis() + 30_000;
    ht_init_test_contract(certificate_expiration, None);

    // fail if not activate
    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;
    result_err_matches!(result, AddContractControllerError::ContractNotActivated);

    ht_activate_contract(contract_owner).await;

    // fail if not owner
    set_test_caller(ht_get_test_deployer());
    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;
    result_err_matches!(result, AddContractControllerError::PermissionDenied);

    // fail certificate not expired
    set_test_caller(contract_owner);
    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;
    result_err_matches!(result, AddContractControllerError::CertificateNotExpired);

    // success
    set_test_time(certificate_expiration);

    // fail cycles low
    let threshold = get_holder_model(|state, model| {
        model.initial_cycles
            * (state
                .get_env()
                .get_settings()
                .critical_cycles_threshold_percentage as u128)
            / 100
    });
    ht_set_test_cycles(threshold);
    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;

    assert!(result.is_ok());

    get_holder_model(|_, model| {
        assert!(matches!(
            model.upgrade_contract_state.value,
            UpgradeContractState::AllowAddController
        ))
    });

    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: Principal::management_canister(),
    })
    .await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_add_contract_controller_with_sale_intention() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();
    let new_controller = Principal::from_text("xon54-haaaa-aaaak-quewq-cai").unwrap();
    let certificate_expiration = HT_SALE_DEAL_SAFE_CLOSE_DURATION * 2;

    ht_capture_identity_and_fetch_assets(
        certificate_expiration,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    ht_set_sale_intentions(owner).await;

    let sale_offer = 3 * HT_MIN_PRICE;
    let holder_information = ht_set_sale_offer(owner, sale_offer).await;
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        sale_offer
    );

    ht_end_quarantine().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    ht_set_buyer_offer(&buyer, HT_MIN_PRICE, None).await;

    set_test_time(certificate_expiration);

    get_holder_model(|_, model| {
        assert!(matches!(
            model.upgrade_contract_state.value,
            UpgradeContractState::WaitingCertificateExpiration
        ))
    });

    set_test_caller(owner);

    // fail cycles low
    let threshold = get_holder_model(|state, model| {
        model.initial_cycles
            * (state
                .get_env()
                .get_settings()
                .critical_cycles_threshold_percentage as u128)
            / 100
    });
    ht_set_test_cycles(threshold);
    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;

    result_err_matches!(
        result,
        AddContractControllerError::CriticalCyclesLevel {
            critical_threshold_cycles
        }
    if critical_threshold_cycles == threshold);

    // cycles ok
    ht_set_test_cycles(threshold + 1);

    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;

    let add_controller_delay = get_env().get_settings().add_contract_controller_delay;
    result_err_matches!(
        result,
    AddContractControllerError::AddControllerDelay {
            delay: DelayedTimestampMillis { delay, time }
        }
    if delay == add_controller_delay && time == certificate_expiration + add_controller_delay);

    get_holder_model(|_, model| {
        assert!(matches!(
            model.upgrade_contract_state.value,
            UpgradeContractState::WaitingAddControllerDelay { time }
        if time == certificate_expiration + add_controller_delay))
    });

    set_test_time(certificate_expiration + add_controller_delay - 1);
    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;
    result_err_matches!(
        result,
    AddContractControllerError::AddControllerDelay {
            delay: DelayedTimestampMillis { delay, time }
        }
    if delay == 1 && time == certificate_expiration + add_controller_delay);

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });

    set_test_time(certificate_expiration + add_controller_delay);
    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;
    assert!(result.is_ok());

    get_holder_model(|_, model| {
        assert!(matches!(
            model.upgrade_contract_state.value,
            UpgradeContractState::AllowAddController
        ))
    });

    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: Principal::management_canister(),
    })
    .await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_add_contract_controller_with_accepted_sale_deal() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_buyer();
    let new_controller = Principal::from_text("xon54-haaaa-aaaak-quewq-cai").unwrap();
    let certificate_expiration = HT_SALE_DEAL_SAFE_CLOSE_DURATION * 2;

    ht_capture_identity_and_fetch_assets(
        certificate_expiration,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    ht_set_sale_intentions(owner).await;

    let sale_offer = 3 * HT_MIN_PRICE;
    let holder_information = ht_set_sale_offer(owner, sale_offer).await;
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        sale_offer
    );

    ht_end_quarantine().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    let buyer_offer_amount = 2 * HT_MIN_PRICE;
    ht_set_buyer_offer(&buyer, buyer_offer_amount, None).await;

    set_test_caller(owner);

    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer,
        offer_amount: buyer_offer_amount,
        check_higher_offer: true,
    })
    .await;
    result_ok_with_holder_information!(result);

    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::StartAccept
                })
            }
        } if accept_buyer == &buyer);

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToTransitAccount
                })
            }
        } if accept_buyer == &buyer);

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferReferralReward { .. }
                })
            }
        } if accept_buyer == &buyer);

    // CERTIFICATE EXPIRED

    set_test_time(certificate_expiration);

    get_holder_model(|_, model| {
        assert!(matches!(
            model.upgrade_contract_state.value,
            UpgradeContractState::WaitingCertificateExpiration
        ))
    });

    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;

    let add_controller_delay = get_env().get_settings().add_contract_controller_delay;
    result_err_matches!(
        result,
    AddContractControllerError::AddControllerDelay {
            delay: DelayedTimestampMillis { delay, time }
        }
    if delay == add_controller_delay && time == certificate_expiration + add_controller_delay);

    get_holder_model(|_, model| {
        assert!(matches!(
            model.upgrade_contract_state.value,
            UpgradeContractState::WaitingAddControllerDelay { time }
        if time == certificate_expiration + add_controller_delay))
    });

    set_test_time(certificate_expiration + 10);
    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;
    result_err_matches!(
        result,
    AddContractControllerError::AddControllerDelay {
            delay: DelayedTimestampMillis { delay, time }
        }
    if delay == add_controller_delay - 10 && time == certificate_expiration + add_controller_delay);

    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferReferralReward { .. }
                })
            }
        } if accept_buyer == &buyer);

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
                sub_state: HoldingState::CancelSaleDeal {
                    sub_state: CancelSaleDealState::StartCancelSaleDeal {
                    sale_deal_state,
                },
                wrap_holding_state,
            }
        } if
        matches!(sale_deal_state.as_ref(), SaleDealState::Accept { sub_state: SaleDealAcceptSubState::TransferReferralReward { .. }, .. })
        && matches!(wrap_holding_state.as_ref(), HoldingState::Unsellable { reason: UnsellableReason::CertificateExpired }));

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
                sub_state: HoldingState::CancelSaleDeal {
                    sub_state: CancelSaleDealState::RefundBuyerFromTransitAccount { .. },
                wrap_holding_state,
            }
        } if
        matches!(wrap_holding_state.as_ref(), HoldingState::Unsellable { reason: UnsellableReason::CertificateExpired }));

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });

    let approved_account = ht_get_buyer_approved_account(&buyer);
    assert_eq!(
        ht_get_account_balance(to_account_identifier(&approved_account).unwrap().to_hex()),
        buyer_offer_amount - 2 * HT_LEDGER_FEE
    );

    set_test_time(certificate_expiration + add_controller_delay);
    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: new_controller,
    })
    .await;
    assert!(result.is_ok());

    get_holder_model(|_, model| {
        assert!(matches!(
            model.upgrade_contract_state.value,
            UpgradeContractState::AllowAddController
        ))
    });

    let result = add_contract_controller_int(AddContractControllerArgs {
        controller: Principal::management_canister(),
    })
    .await;
    assert!(result.is_ok());
}
