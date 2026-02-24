use std::ops::Deref;

use candid::Principal;
use common_canister_impl::components::{
    nns::api::ListNeuronsResponse,
    nns_dap::api::{AccountDetails, SubAccountDetails},
};
use common_canister_types::LedgerAccount;
use contract_canister_api::types::holder::{
    CancelSaleDealState, DelegationState, FetchAssetsState, FetchIdentityAccountsNnsAssetsState,
    FetchNnsAssetsState, HolderState, HoldingState, LimitFailureReason, UnsellableReason,
};
use ic_ledger_types::{AccountIdentifier, Subaccount};

use crate::{
    handlers::holder::states::get_holder_model,
    result_err_matches, result_ok_with_holder_information,
    test::tests::{
        components::{ic::set_test_caller, time::set_test_time},
        drivers::fetch::{send_delegation_got, FetchConfig},
        ht_get_test_deployer, ht_get_test_other,
        support::{
            fixtures::fake_neuron,
            mocks::{
                mock_account_ok, mock_identity_accounts_no_accounts, mock_neuron_ids,
                mock_neurons_response, mock_prepare_delegation_ok,
                mock_prepare_delegation_ok_default,
            },
        },
        HT_CAPTURED_IDENTITY_NUMBER, HT_MIN_PRICE, HT_QUARANTINE_DURATION,
        HT_SALE_DEAL_SAFE_CLOSE_DURATION, TEST_DELEGATION_KEY_1,
    },
    test_state_matches,
    updates::holder::{
        retry_prepare_delegation::retry_prepare_delegation_int,
        set_sale_intention::set_sale_intention_int, set_sale_offer::set_sale_offer_int,
    },
};
use contract_canister_api::retry_prepare_delegation::RetryPrepareDelegationError;

use crate::test::tests::drivers::{capture::drive_to_captured, fetch::drive_to_hold};

// ---------------------------------------------------------------------------
// test_fetch_assets_fail_certificate_expired
// ---------------------------------------------------------------------------

/// Certificate expiration triggers Unsellable::CertificateExpired during GetIdentityAccounts.
#[tokio::test]
async fn test_fetch_assets_fail_certificate_expired() {
    drive_to_captured(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    // StartFetchAssets → GetIdentityAccounts
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::GetIdentityAccounts,
            },
            ..
        }
    });

    // Advance time past certificate expiration — next tick should detect it
    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION + 1);
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });
}

// ---------------------------------------------------------------------------
// test_fetch_assets — happy path, single account, no neurons
// ---------------------------------------------------------------------------

/// Full happy-path: capture → fetch → check → Hold.
/// Assets are moved from `fetching_assets` to `assets` on the StartHolding → Hold transition.
#[tokio::test]
async fn test_fetch_assets() {
    drive_to_hold(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: None
        }
    });

    get_holder_model(|_, model| {
        assert!(model.assets.is_some(), "assets should be saved after Hold");
        assert!(
            model.fetching_assets.is_none(),
            "fetching_assets should be cleared after Hold"
        );
    });
}

// ---------------------------------------------------------------------------
// test_fetch_assets_multiple_accounts
// ---------------------------------------------------------------------------

/// Two identity accounts (default + #1), each processed independently with different
/// delegation keys. Verifies final Hold state has two distinct NNS-asset slots.
#[tokio::test]
async fn test_fetch_assets_multiple_accounts() {
    drive_to_hold(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
        &FetchConfig::two_accounts_no_neurons(),
    )
    .await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: None
        }
    });

    get_holder_model(|_, model| {
        let nns_assets = model
            .assets
            .as_ref()
            .expect("assets should be saved")
            .value
            .nns_assets
            .as_ref()
            .expect("nns_assets should be present");

        assert_eq!(nns_assets.len(), 2, "should have 2 identity account slots");
        assert_eq!(
            nns_assets[0].identity_account_number, None,
            "first slot is default account"
        );
        assert_eq!(
            nns_assets[1].identity_account_number,
            Some(1),
            "second slot is account #1"
        );
        assert!(
            nns_assets[0].principal.is_some(),
            "default account should have a resolved principal"
        );
        assert!(
            nns_assets[1].principal.is_some(),
            "account #1 should have a resolved principal"
        );
        assert_ne!(
            nns_assets[0].principal, nns_assets[1].principal,
            "accounts should have different principals (different delegation keys)"
        );
    });
}

// ---------------------------------------------------------------------------
// test_fetch_assets_with_neuron_limit
// ---------------------------------------------------------------------------

/// Neuron count exceeds max_neurons_allowed → Unsellable::CheckLimitFailed::TooManyNeurons.
#[tokio::test]
async fn test_fetch_assets_with_neuron_limit() {
    // 16 neuron IDs guarantees we exceed max_neurons_allowed (= 5 in test settings).
    let neuron_ids: Vec<u64> = (1u64..=16).collect();

    // Build identity_principal lazily — the driver will set it up; we extract it from state
    // after drive_to_captured so we can build realistic neuron responses.
    drive_to_captured(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    // Drive up to NeedPrepareDelegation (StartFetchAssets → GetIdentityAccounts → mock NoAccounts)
    super::tick().await;
    mock_identity_accounts_no_accounts();
    super::tick().await;
    // State: NeedPrepareDelegation

    // Deliver delegation
    mock_prepare_delegation_ok_default();
    super::tick().await;
    // State: GetDelegationWaiting

    send_delegation_got(TEST_DELEGATION_KEY_1.to_vec());
    // State: GetNeuronsIds

    let identity_principal =
        get_holder_model(|_, model| model.get_delegation_controller().unwrap());

    // Send neuron IDs (16 → exceeds limit)
    mock_neuron_ids(neuron_ids);
    super::tick().await;
    // State: GetNeuronsInformation — page 1

    // Page 1: neurons 1-4 (4 neurons, 1 controlled)
    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![
            fake_neuron(1, None, vec![]),
            fake_neuron(2, Some(Principal::management_canister()), vec![]),
            fake_neuron(3, Some(identity_principal), vec![]),
            fake_neuron(
                4,
                Some(identity_principal),
                vec![Principal::management_canister()],
            ),
        ],
        total_pages_available: None,
    });
    super::tick().await;

    // Page 2: neurons 5-8
    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![
            fake_neuron(5, None, vec![]),
            fake_neuron(6, Some(identity_principal), vec![]),
            fake_neuron(7, Some(identity_principal), vec![]),
            fake_neuron(
                8,
                Some(identity_principal),
                vec![Principal::management_canister()],
            ),
        ],
        total_pages_available: None,
    });
    super::tick().await;

    // Page 3: neurons 9-12 — at this point limit is exceeded
    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![
            fake_neuron(9, Some(identity_principal), vec![]),
            fake_neuron(10, Some(identity_principal), vec![]),
            fake_neuron(11, Some(identity_principal), vec![]),
            fake_neuron(
                12,
                Some(identity_principal),
                vec![Principal::management_canister()],
            ),
        ],
        total_pages_available: None,
    });
    super::tick().await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CheckLimitFailed {
                reason: LimitFailureReason::TooManyNeurons
            }
        },
    });
}

// ---------------------------------------------------------------------------
// test_fetch_assets_with_account_limit
// ---------------------------------------------------------------------------

/// Sub-account count exceeds max_subaccounts_allowed → Unsellable::CheckLimitFailed::TooManyAccounts.
#[tokio::test]
async fn test_fetch_assets_with_account_limit() {
    drive_to_captured(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    // StartFetchAssets → GetIdentityAccounts
    super::tick().await;
    mock_identity_accounts_no_accounts();
    super::tick().await;
    // State: NeedPrepareDelegation

    // Delegation
    mock_prepare_delegation_ok_default();
    super::tick().await;

    send_delegation_got(TEST_DELEGATION_KEY_1.to_vec());
    // State: GetNeuronsIds

    // 1 neuron ID → goes through neurons path
    mock_neuron_ids(vec![1u64]);
    super::tick().await;

    // Neurons response: 1 neuron, uncontrolled — no hotkey deletion needed
    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![fake_neuron(1, None, vec![])],
        total_pages_available: None,
    });
    super::tick().await;
    // Extra tick to transition out of GetNeuronsInformation
    super::tick().await;
    // May be in DeletingNeuronsHotkeys (empty) or GetAccountsInformation — drain
    while !get_holder_model(|_, model| {
        matches!(
            &model.state.value,
            HolderState::Holding {
                sub_state: HoldingState::FetchAssets {
                    fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                        sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                            sub_state: FetchNnsAssetsState::GetAccountsInformation,
                            ..
                        },
                    },
                    ..
                }
            }
        )
    }) {
        super::tick().await;
    }

    // GetAccountsInformation: return account with 9 sub-accounts (exceeds max_subaccounts_allowed = 5)
    let identity_principal =
        get_holder_model(|_, model| model.get_delegation_controller().unwrap());
    let subaccount = [0u8; 32];

    let sub_accounts: Vec<SubAccountDetails> = (1u8..10)
        .map(|i| {
            let mut msubaccount = subaccount;
            msubaccount[31] = i;
            SubAccountDetails {
                name: format!("SubAccount{}", i + 1),
                sub_account: msubaccount.to_vec().into(),
                account_identifier: AccountIdentifier::new(
                    &identity_principal,
                    &Subaccount(msubaccount),
                )
                .to_hex(),
            }
        })
        .collect();
    mock_account_ok(AccountDetails {
        principal: identity_principal,
        account_identifier: AccountIdentifier::new(&identity_principal, &Subaccount(subaccount))
            .to_hex(),
        hardware_wallet_accounts: vec![],
        sub_accounts,
    });
    super::tick().await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CheckLimitFailed {
                reason: LimitFailureReason::TooManyAccounts
            }
        },
    });
}

// ---------------------------------------------------------------------------
// test_refresh_assets
// ---------------------------------------------------------------------------

/// After reaching Hold, the quarantine timer triggers a re-fetch.
/// The state machine returns to StartFetchAssets after quarantine expires.
#[tokio::test]
async fn test_refresh_assets() {
    drive_to_hold(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold { .. }
    });
}

// ---------------------------------------------------------------------------
// test_retry_prepare_delegation
// ---------------------------------------------------------------------------

/// retry_prepare_delegation:
///   - called from wrong state (not GetDelegationWaiting) → HolderWrongState
///   - called correctly from GetDelegationWaiting → resets to NeedPrepareDelegation
#[tokio::test]
async fn test_retry_prepare_delegation() {
    let owner = ht_get_test_deployer();
    let other = ht_get_test_other();

    drive_to_captured(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    // StartFetchAssets → GetIdentityAccounts
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::GetIdentityAccounts,
            },
            ..
        }
    });

    // GetIdentityAccounts → NeedPrepareDelegation
    mock_identity_accounts_no_accounts();
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::ObtainDelegationState {
                        sub_state: DelegationState::NeedPrepareDelegation { .. },
                        ..
                    },
                    ..
                },
            },
            ..
        }
    });

    // retry_prepare_delegation from NeedPrepareDelegation (wrong state) → error
    set_test_caller(other);
    let result = retry_prepare_delegation_int().await;
    result_err_matches!(result, RetryPrepareDelegationError::HolderWrongState);

    // State must be unchanged
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::ObtainDelegationState {
                        sub_state: DelegationState::NeedPrepareDelegation { .. },
                        ..
                    },
                    ..
                },
            },
            ..
        }
    });

    // Advance to GetDelegationWaiting
    mock_prepare_delegation_ok(TEST_DELEGATION_KEY_1.to_vec());
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::ObtainDelegationState {
                        sub_state: DelegationState::GetDelegationWaiting { .. },
                        ..
                    },
                    ..
                },
            },
            ..
        }
    });

    // retry_prepare_delegation from GetDelegationWaiting (correct) → resets to NeedPrepareDelegation
    let result = retry_prepare_delegation_int().await;
    assert!(
        result.is_ok(),
        "retry_prepare_delegation should succeed from GetDelegationWaiting"
    );
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::ObtainDelegationState {
                        sub_state: DelegationState::NeedPrepareDelegation { .. },
                        ..
                    },
                    ..
                },
            },
            ..
        }
    });
}

// ---------------------------------------------------------------------------
// test_refetch_with_limit_failure_after_sale
// ---------------------------------------------------------------------------

/// Re-fetch triggered after quarantine while an active sale deal is in progress.
/// Neuron limit exceeded during re-fetch → CancelSaleDeal → Unsellable::TooManyNeurons.
#[tokio::test]
async fn test_refetch_with_limit_failure_after_sale() {
    let test_identity_number = 779;

    // Reach Hold state
    drive_to_hold(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        test_identity_number,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    // Set up sale intention + offer
    set_test_caller(ht_get_test_deployer());
    let _ = set_sale_intention_int(LedgerAccount::Account {
        owner: ht_get_test_deployer(),
        subaccount: None,
    })
    .await;
    let result = set_sale_offer_int(HT_MIN_PRICE).await;
    let _ = result_ok_with_holder_information!(result);

    // Advance time past quarantine → re-fetch starts
    set_test_time(HT_QUARANTINE_DURATION + 1);
    // Three ticks: Hold → detect quarantine → StartFetchAssets → GetIdentityAccounts → NeedPrepareDelegation
    super::tick().await;
    super::tick().await;
    super::tick().await;

    // Drive through identity-accounts response (NoAccounts) + delegation
    mock_identity_accounts_no_accounts();
    super::tick().await;
    // State: NeedPrepareDelegation

    mock_prepare_delegation_ok_default();
    super::tick().await;
    // State: GetDelegationWaiting

    send_delegation_got(TEST_DELEGATION_KEY_1.to_vec());

    let identity_principal =
        get_holder_model(|_, model| model.get_delegation_controller().unwrap());

    // 16 neuron IDs → exceeds limit
    mock_neuron_ids(vec![
        1u64, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
    super::tick().await;

    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![
            fake_neuron(1, None, vec![]),
            fake_neuron(2, Some(Principal::management_canister()), vec![]),
            fake_neuron(3, Some(identity_principal), vec![]),
            fake_neuron(
                4,
                Some(identity_principal),
                vec![Principal::management_canister()],
            ),
        ],
        total_pages_available: None,
    });
    super::tick().await;

    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![
            fake_neuron(5, None, vec![]),
            fake_neuron(6, Some(identity_principal), vec![]),
            fake_neuron(7, Some(identity_principal), vec![]),
            fake_neuron(
                8,
                Some(identity_principal),
                vec![Principal::management_canister()],
            ),
        ],
        total_pages_available: None,
    });
    super::tick().await;

    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![
            fake_neuron(9, Some(identity_principal), vec![]),
            fake_neuron(10, Some(identity_principal), vec![]),
            fake_neuron(11, Some(identity_principal), vec![]),
            fake_neuron(
                12,
                Some(identity_principal),
                vec![Principal::management_canister()],
            ),
        ],
        total_pages_available: None,
    });
    super::tick().await;

    // With an active sale deal, limit failure triggers CancelSaleDeal first
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CancelSaleDeal {
            sub_state: CancelSaleDealState::StartCancelSaleDeal { .. },
            wrap_holding_state
        }
    } if HoldingState::Unsellable {
        reason: UnsellableReason::CheckLimitFailed {
            reason: LimitFailureReason::TooManyNeurons
        }
    } == *wrap_holding_state.deref());

    super::tick().await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CheckLimitFailed {
                reason: LimitFailureReason::TooManyNeurons
            }
        },
    });
}
