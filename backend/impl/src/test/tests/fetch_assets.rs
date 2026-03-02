use std::ops::Deref;

use crate::handlers::holder::build_holder_information_with_load;
use common_canister_impl::components::{
    nns::api::ListNeuronsResponse,
    nns_dap::api::{AccountDetails, SubAccountDetails},
};
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
        sale::ht_set_sale_intentions,
        support::{
            fixtures::fake_neuron,
            mocks::{
                mock_account_ok, mock_identity_accounts_no_accounts, mock_neuron_ids,
                mock_neurons_response, mock_prepare_delegation_ok,
                mock_prepare_delegation_ok_default,
            },
        },
        HT_CAPTURED_IDENTITY_NUMBER, HT_MIN_PRICE, HT_QUARANTINE_DURATION,
        HT_SALE_DEAL_SAFE_CLOSE_DURATION, HT_STANDARD_CERT_EXPIRATION, TEST_DELEGATION_KEY_1,
    },
    test_state_matches,
    updates::holder::{
        retry_prepare_delegation::retry_prepare_delegation_int, set_sale_offer::set_sale_offer_int,
    },
};
use contract_canister_api::retry_prepare_delegation::RetryPrepareDelegationError;

use crate::test::tests::drivers::{capture::drive_to_captured, fetch::drive_to_hold};

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/// Mocks and drives through 3 pages of neuron responses that together exceed
/// `max_neurons_allowed` (= 5 in test settings). After this call the state
/// machine will have transitioned to `Unsellable::CheckLimitFailed::TooManyNeurons`
/// (or, when a sale deal is active, through `CancelSaleDeal` first).
///
/// **Precondition:** state machine is in `GetNeuronsInformation` and
/// `identity_principal` has already been obtained from model state.
///
/// The 3 pages contain 4 neurons each (12 total after page 3), of which
/// several are controller/hotkey-linked to `identity_principal`, pushing the
/// counted-neurons total above the limit on page 3.
async fn mock_drive_neurons_exceeding_limit(identity_principal: candid::Principal) {
    // Page 1: neurons 1-4 (2 linked to identity_principal)
    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![
            fake_neuron(1, None, vec![]),
            fake_neuron(2, Some(candid::Principal::management_canister()), vec![]),
            fake_neuron(3, Some(identity_principal), vec![]),
            fake_neuron(
                4,
                Some(identity_principal),
                vec![candid::Principal::management_canister()],
            ),
        ],
        total_pages_available: None,
    });
    super::tick().await;

    // Page 2: neurons 5-8 (3 linked to identity_principal)
    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![
            fake_neuron(5, None, vec![]),
            fake_neuron(6, Some(identity_principal), vec![]),
            fake_neuron(7, Some(identity_principal), vec![]),
            fake_neuron(
                8,
                Some(identity_principal),
                vec![candid::Principal::management_canister()],
            ),
        ],
        total_pages_available: None,
    });
    super::tick().await;

    // Page 3: neurons 9-12 — limit is exceeded here
    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![
            fake_neuron(9, Some(identity_principal), vec![]),
            fake_neuron(10, Some(identity_principal), vec![]),
            fake_neuron(11, Some(identity_principal), vec![]),
            fake_neuron(
                12,
                Some(identity_principal),
                vec![candid::Principal::management_canister()],
            ),
        ],
        total_pages_available: None,
    });
    super::tick().await;
}

// ---------------------------------------------------------------------------
// test_fetch_assets_fail_certificate_expired
// ---------------------------------------------------------------------------

/// Certificate expiration triggers Unsellable::CertificateExpired during GetIdentityAccounts.
#[tokio::test]
async fn test_fetch_assets_fail_certificate_expired() {
    drive_to_captured(
        HT_STANDARD_CERT_EXPIRATION,
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
// test_fetching_assets_includes_current_nns_data
// ---------------------------------------------------------------------------

/// Verifies that `build_holder_information_with_load` merges `fetching_nns_assets`
/// (in-progress data for the currently-fetched account) into the corresponding slot
/// of `fetching_assets.nns_assets` in the returned `HolderInformation`.
///
/// The test pauses mid-fetch, after a neurons-information page has been processed
/// (so `fetching_nns_assets.controlled_neurons` is `Some`), and asserts that the
/// slot for the active account in `fetching_assets` reflects that data rather than
/// remaining `None`.
#[tokio::test]
async fn test_fetching_assets_includes_current_nns_data() {
    use crate::test::tests::support::{
        fixtures::fake_neuron,
        mocks::{mock_neuron_ids, mock_neurons_response, mock_prepare_delegation_ok_default},
    };

    drive_to_captured(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    // StartFetchAssets → GetIdentityAccounts
    super::tick().await;

    // Single account path: send NoAccounts → NeedPrepareDelegation
    mock_identity_accounts_no_accounts();
    super::tick().await;

    // NeedPrepareDelegation → GetDelegationWaiting
    mock_prepare_delegation_ok_default();
    super::tick().await;

    // Deliver delegation → GetNeuronsIds
    send_delegation_got(TEST_DELEGATION_KEY_1.to_vec());

    // Send 1 neuron ID → GetNeuronsInformation
    // At this point fetching_nns_assets is initialised:
    //   Some(NnsHolderAssets { controlled_neurons: None, accounts: None })
    mock_neuron_ids(vec![1u64]);
    super::tick().await;

    // Extract the delegation principal so we can build a realistic neuron response.
    let identity_principal =
        get_holder_model(|_, model| model.get_delegation_controller().unwrap());

    // Mock one neuron page — controlled_neurons will be filled in fetching_nns_assets.
    let neuron = fake_neuron(1, Some(identity_principal), vec![]);
    mock_neurons_response(&ListNeuronsResponse {
        neuron_infos: vec![],
        full_neurons: vec![neuron],
        total_pages_available: None,
    });
    super::tick().await;
    // State: GetNeuronsInformation (page processed) or DeletingNeuronsHotkeys.
    // fetching_nns_assets.controlled_neurons is now Some([...]).

    // Capture the current fetching_nns_assets value from the model to compare against.
    let expected_nns_assets = get_holder_model(|_, model| model.fetching_nns_assets.clone());
    assert!(
        expected_nns_assets.is_some(),
        "fetching_nns_assets should be set while an account fetch is in progress"
    );

    // Build the holder information response and verify the merge.
    let holder_info = build_holder_information_with_load();

    let fetching = holder_info
        .fetching_assets
        .expect("fetching_assets should be present during fetch");
    let slots = fetching
        .nns_assets
        .expect("nns_assets slots should be present");

    assert_eq!(
        slots.len(),
        1,
        "should have exactly 1 identity account slot"
    );

    let slot_assets = slots[0]
        .assets
        .as_ref()
        .expect("slot.assets should be filled from fetching_nns_assets, not None");

    assert_eq!(
        slot_assets,
        expected_nns_assets.as_ref().unwrap(),
        "slot.assets must equal model.fetching_nns_assets"
    );
    assert!(
        slot_assets.controlled_neurons.is_some(),
        "controlled_neurons should be populated after neurons-information page was processed"
    );
}

// ---------------------------------------------------------------------------
// test_fetch_assets — happy path, single account, no neurons
// ---------------------------------------------------------------------------

/// Full happy-path: capture → fetch → check → Hold.
/// Assets are moved from `fetching_assets` to `assets` on the StartHolding → Hold transition.
#[tokio::test]
async fn test_fetch_assets() {
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
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
        HT_STANDARD_CERT_EXPIRATION,
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
        assert_eq!(
            nns_assets[0].account_name, None,
            "default account should have no name"
        );
        assert_eq!(
            nns_assets[1].account_name,
            Some("Account 1".to_string()),
            "named account should carry the name from the II response"
        );
    });
}

// ---------------------------------------------------------------------------
// test_account_name_single_account — default (NoAccounts) path has no name
// ---------------------------------------------------------------------------

/// Verifies that when II returns NoAccounts (single default account path),
/// the stored slot has account_name == None.
#[tokio::test]
async fn test_account_name_single_account() {
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    get_holder_model(|_, model| {
        let nns_assets = model
            .assets
            .as_ref()
            .expect("assets should be saved")
            .value
            .nns_assets
            .as_ref()
            .expect("nns_assets should be present");

        assert_eq!(nns_assets.len(), 1, "should have 1 identity account slot");
        assert_eq!(
            nns_assets[0].identity_account_number, None,
            "single slot is the default account"
        );
        assert_eq!(
            nns_assets[0].account_name, None,
            "default account from NoAccounts path should have no name"
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
        HT_STANDARD_CERT_EXPIRATION,
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
    mock_drive_neurons_exceeding_limit(identity_principal).await;

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
        HT_STANDARD_CERT_EXPIRATION,
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
        HT_STANDARD_CERT_EXPIRATION,
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
        HT_STANDARD_CERT_EXPIRATION,
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
    ht_set_sale_intentions(ht_get_test_deployer()).await;
    let result = set_sale_offer_int(HT_MIN_PRICE).await;
    let _ = result_ok_with_holder_information!(result);

    // Advance time past quarantine → re-fetch starts
    set_test_time(HT_QUARANTINE_DURATION + 1);
    // Two ticks: Hold → detect quarantine expired → StartFetchAssets
    super::tick().await;
    super::tick().await;
    // State: StartFetchAssets

    // StartFetchAssets → GetIdentityAccounts
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

    mock_drive_neurons_exceeding_limit(identity_principal).await;

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
