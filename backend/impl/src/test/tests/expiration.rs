use candid::Principal;
use common_canister_impl::components::ledger::to_account_identifier;
use common_canister_types::TokenE8s;
use contract_canister_api::{
    accept_buyer_offer::AcceptBuyerOfferArgs,
    types::holder::{
        CancelSaleDealState, HolderState, HoldingState, ReleaseInitiation, ReleaseState,
        SaleDealAcceptSubState, SaleDealState, UnsellableReason,
    },
};

use crate::{
    get_env,
    handlers::rewards_calculator::get_permyriad,
    result_ok_with_holder_information,
    test::tests::{
        components::{
            ic::set_test_caller,
            ledger::{ht_get_account_balance, HT_LEDGER_FEE},
            time::set_test_time,
        },
        drivers::hold::drive_to_standard_hold,
        ht_get_test_contract_canister, ht_get_test_deployer, ht_get_test_hub_canister,
        sale::{
            ht_drive_to_trading, ht_get_buyer_approved_account, ht_set_buyer_offer,
            ht_set_sale_intentions,
        },
        HT_MIN_PRICE, HT_SALE_DEAL_SAFE_CLOSE_DURATION,
    },
    test_state_matches,
    updates::holder::{
        accept_buyer_offer::accept_buyer_offer_int,
        start_release_identity::start_release_identity_int,
    },
};

#[tokio::test]
async fn test_sale_intention_expiration() {
    // PREPARE TEST
    let owner = ht_get_test_deployer();

    drive_to_standard_hold(owner).await;
    ht_set_sale_intentions(owner).await;

    // EXPIRED SALE DEAL

    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });
}

#[tokio::test]
async fn test_sale_deal_expiration_after_quarantine() {
    // PREPARE TEST
    let owner = ht_get_test_deployer();
    let buyer1 = ht_get_test_hub_canister();
    let buyer2 = ht_get_test_contract_canister();

    ht_drive_to_trading(owner, 3 * HT_MIN_PRICE).await;

    // SET BUYER1 OFFER
    let buyer1_offer_amount = HT_MIN_PRICE;
    ht_set_buyer_offer(&buyer1, buyer1_offer_amount, None).await;

    // SET BUYER2 OFFER
    let buyer2_offer_amount = 2 * HT_MIN_PRICE;
    ht_set_buyer_offer(&buyer2, buyer2_offer_amount, Some("one_percent".to_owned())).await;

    // EXPIRED SALE DEAL

    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });

    assert_eq!(
        ht_get_account_balance(
            to_account_identifier(&ht_get_buyer_approved_account(&buyer1))
                .unwrap()
                .to_hex()
        ),
        buyer1_offer_amount
    );
    assert_eq!(
        ht_get_account_balance(
            to_account_identifier(&ht_get_buyer_approved_account(&buyer2))
                .unwrap()
                .to_hex()
        ),
        buyer2_offer_amount
    );

    // check release possible
    set_test_caller(owner);
    let result = start_release_identity_int().await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.state,
        HolderState::Release {
            release_initiation: ReleaseInitiation::Manual {
                unsellable_reason: Some(UnsellableReason::CertificateExpired)
            },
            sub_state: ReleaseState::StartRelease,
        }
    );
}

async fn accept_sale_deal(
    owner: Principal,
    buyer: Principal,
    offer_amount: TokenE8s,
    referral: Option<String>,
) {
    ht_drive_to_trading(owner, 2 * offer_amount).await;

    // SET BUYER1 OFFER
    ht_set_buyer_offer(&buyer, offer_amount, referral).await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: Some(SaleDealState::Trading)
        }
    });

    let approved_account_hex = to_account_identifier(&ht_get_buyer_approved_account(&buyer))
        .unwrap()
        .to_hex();
    assert_eq!(ht_get_account_balance(approved_account_hex), offer_amount);

    // ACCEPT BUYER OFFER
    set_test_caller(owner);
    let result = accept_buyer_offer_int(AcceptBuyerOfferArgs {
        buyer,
        offer_amount: offer_amount,
        check_higher_offer: true,
    })
    .await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.sale_deal.as_ref().unwrap().get_price(),
        offer_amount
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
}

#[tokio::test]
async fn test_expiration_accepted_sale_deal_before_start_accept() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_hub_canister();
    let buyer_offer_amount = HT_MIN_PRICE;

    accept_sale_deal(owner, buyer, buyer_offer_amount, None).await;

    // EXPIRED CERTIFICATE
    set_test_time(2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    super::tick().await;

    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::CancelSaleDeal {
                sub_state: CancelSaleDealState::StartCancelSaleDeal {
                    sale_deal_state,
                },
                wrap_holding_state,
            }
        } if
        matches!(sale_deal_state.as_ref(), SaleDealState::Accept { sub_state: SaleDealAcceptSubState::StartAccept, .. })
        && matches!(wrap_holding_state.as_ref(), HoldingState::Unsellable { reason: UnsellableReason::CertificateExpired }));

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });
    assert_eq!(
        ht_get_account_balance(
            to_account_identifier(&ht_get_buyer_approved_account(&buyer))
                .unwrap()
                .to_hex()
        ),
        buyer_offer_amount
    );
}

#[tokio::test]
async fn test_expiration_accepted_sale_deal_before_transfer_to_transit() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_hub_canister();
    let buyer_offer_amount = HT_MIN_PRICE;

    accept_sale_deal(owner, buyer, buyer_offer_amount, None).await;

    // EXPIRED SALE DEAL
    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);

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

    // EXPIRED CERTIFICATE
    set_test_time(2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    super::tick().await;

    test_state_matches!(HolderState::Holding {
                sub_state: HoldingState::CancelSaleDeal {
                    sub_state: CancelSaleDealState::StartCancelSaleDeal {
                    sale_deal_state,
                },
                wrap_holding_state,
            }
        } if
        matches!(sale_deal_state.as_ref(), SaleDealState::Accept { sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToTransitAccount, .. })
        && matches!(wrap_holding_state.as_ref(), HoldingState::Unsellable { reason: UnsellableReason::CertificateExpired }));

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::CancelSaleDeal {
                sub_state: CancelSaleDealState::RefundBuyerFromTransitAccount { buyer: refund_buyer },
            wrap_holding_state,
        }
    } if
    refund_buyer == &buyer && matches!(wrap_holding_state.as_ref(), HoldingState::Unsellable { reason: UnsellableReason::CertificateExpired }));

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });
    assert_eq!(
        ht_get_account_balance(
            to_account_identifier(&ht_get_buyer_approved_account(&buyer))
                .unwrap()
                .to_hex()
        ),
        buyer_offer_amount
    );
}

#[tokio::test]
async fn test_expiration_accepted_sale_deal_after_transfer_to_transit() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_hub_canister();
    let buyer_offer_amount = HT_MIN_PRICE;

    accept_sale_deal(owner, buyer, buyer_offer_amount, None).await;

    // EXPIRED SALE DEAL
    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);

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

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferReferralReward { reward_data: None }
                })
            }
        } if accept_buyer == &buyer);

    assert_eq!(
        ht_get_account_balance(
            to_account_identifier(&ht_get_buyer_approved_account(&buyer))
                .unwrap()
                .to_hex()
        ),
        0
    );

    // EXPIRED CERTIFICATE
    set_test_time(2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    super::tick().await;

    test_state_matches!(HolderState::Holding {
                sub_state: HoldingState::CancelSaleDeal {
                    sub_state: CancelSaleDealState::StartCancelSaleDeal {
                    sale_deal_state,
                },
                wrap_holding_state,
            }
        } if
        matches!(sale_deal_state.as_ref(), SaleDealState::Accept { sub_state: SaleDealAcceptSubState::TransferReferralReward { reward_data: None }, .. })
        && matches!(wrap_holding_state.as_ref(), HoldingState::Unsellable { reason: UnsellableReason::CertificateExpired }));

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::CancelSaleDeal {
                sub_state: CancelSaleDealState::RefundBuyerFromTransitAccount { buyer: refund_buyer },
            wrap_holding_state,
        }
    } if
    refund_buyer == &buyer && matches!(wrap_holding_state.as_ref(), HoldingState::Unsellable { reason: UnsellableReason::CertificateExpired }));

    super::tick().await;
    // get_holder_model(|_, model| println!(">>> {:?}", model.state.value));

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });
    assert_eq!(
        ht_get_account_balance(
            to_account_identifier(&ht_get_buyer_approved_account(&buyer))
                .unwrap()
                .to_hex()
        ),
        buyer_offer_amount - 2 * HT_LEDGER_FEE
    );
}

#[tokio::test]
async fn test_expiration_accepted_sale_deal_before_transfer_to_seller() {
    let owner = ht_get_test_deployer();
    let buyer = ht_get_test_hub_canister();
    let buyer_offer_amount = HT_MIN_PRICE;

    accept_sale_deal(owner, buyer, buyer_offer_amount, None).await;

    // EXPIRED SALE DEAL
    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);

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

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferReferralReward { reward_data: None }
                })
            }
        } if accept_buyer == &buyer);

    assert_eq!(
        ht_get_account_balance(
            to_account_identifier(&ht_get_buyer_approved_account(&buyer))
                .unwrap()
                .to_hex()
        ),
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
        } if accept_buyer == &buyer);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferHubReward
                })
            }
        } if accept_buyer == &buyer);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: None,
                sale_deal_state: Some(SaleDealState::Accept {
                    buyer: accept_buyer,
                    sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToSellerAccount
                })
            }
        } if accept_buyer == &buyer);

    // EXPIRED CERTIFICATE
    set_test_time(2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    super::tick().await;

    test_state_matches!(HolderState::Holding {
                sub_state: HoldingState::CancelSaleDeal {
                    sub_state: CancelSaleDealState::StartCancelSaleDeal {
                    sale_deal_state,
                },
                wrap_holding_state,
            }
        } if
        matches!(sale_deal_state.as_ref(), SaleDealState::Accept { sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToSellerAccount, .. })
        && matches!(wrap_holding_state.as_ref(), HoldingState::Unsellable { reason: UnsellableReason::CertificateExpired }));

    super::tick().await;
    test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::CancelSaleDeal {
                sub_state: CancelSaleDealState::RefundBuyerFromTransitAccount { buyer: refund_buyer },
            wrap_holding_state,
        }
    } if
    refund_buyer == &buyer && matches!(wrap_holding_state.as_ref(), HoldingState::Unsellable { reason: UnsellableReason::CertificateExpired }));

    super::tick().await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });

    let env = get_env();
    let settings = env.get_settings();
    assert_eq!(
        ht_get_account_balance(
            to_account_identifier(&ht_get_buyer_approved_account(&buyer))
                .unwrap()
                .to_hex()
        ),
        buyer_offer_amount
            - get_permyriad(buyer_offer_amount, settings.referral_reward_permyriad).unwrap()
            - get_permyriad(buyer_offer_amount, settings.developer_reward_permyriad).unwrap()
            - get_permyriad(buyer_offer_amount, settings.hub_reward_permyriad).unwrap()
    );
}
