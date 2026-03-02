use candid::Principal;
use common_canister_impl::components::{
    identity::api::{AccountInfo, GetAccountsResponse},
    nns::api::ListNeuronsResponse,
    nns_dap::api::{AccountDetails, SubAccountDetails},
};
use common_canister_types::TimestampMillis;
use contract_canister_api::types::holder::{
    DelegationData, FetchAssetsEvent, FetchAssetsState, FetchIdentityAccountsNnsAssetsState,
    FetchNnsAssetsState, HolderProcessingEvent, HolderState, HoldingProcessingEvent, HoldingState,
    ObtainDelegationEvent,
};
use ic_ledger_types::{AccountIdentifier, Subaccount};

use crate::{
    handlers::holder::{processor::update_holder_with_lock, states::get_holder_model},
    test::tests::{
        components::{ic::set_test_caller, ledger::ht_deposit_account},
        drivers::capture::drive_to_captured,
        ht_get_test_hub_canister,
        support::mocks::{
            mock_account_not_found, mock_account_ok, mock_identity_accounts_no_accounts,
            mock_identity_accounts_ok, mock_neuron_ids, mock_neuron_ids_empty,
            mock_neurons_response, mock_prepare_delegation_ok,
        },
        HT_SEQUENTIAL_CHECK_STEPS, TEST_DELEGATION_EXPIRATION, TEST_DELEGATION_HOSTNAME,
        TEST_DELEGATION_KEY_1, TEST_DELEGATION_KEY_2,
    },
};

// ---------------------------------------------------------------------------
// Configuration types
// ---------------------------------------------------------------------------

/// Controls how the NNS Dapp account inquiry is mocked for one identity account.
pub enum NnsAccountKind {
    /// Account not found — uses `mock_account_not_found()`.
    ///
    /// This is the standard fast-path: no sub-accounts, no deposited balances.
    NotFound,

    /// Account found with 3 standard test sub-accounts.
    ///
    /// The driver reads the current delegation controller from model state,
    /// deposits ICP into 3 sub-accounts (`5_000_000 + i * 1_000` for i in 1..4),
    /// and calls `mock_account_ok(...)`.
    ///
    /// Use this when tests need actual ledger balances to be present (e.g. the
    /// check-assets phase inspecting approvals on real accounts).
    OkWithTestSubAccounts,
}

/// Describes how the fetch-assets phase should be driven for one identity account.
pub struct AccountFetchConfig {
    /// Delegation public key returned by the prepare-delegation mock.
    pub delegation_key: Vec<u8>,
    /// Neuron IDs returned by the get-neurons-ids mock.
    /// Empty vec → no neurons, skips GetNeuronsInformation entirely.
    pub neuron_ids: Vec<u64>,
    /// One `ListNeuronsResponse` per paged chunk.
    /// Required only when `neuron_ids` is non-empty.
    pub neurons_responses: Vec<ListNeuronsResponse>,
    /// How to mock the NNS Dapp account lookup for this identity account.
    pub nns_account: NnsAccountKind,
}

/// Top-level configuration for driving the fetch-assets + check-assets phase.
pub struct FetchConfig {
    /// One entry per identity account to process.
    /// - Single entry  → driver sends `NoAccounts` for `GetIdentityAccounts`.
    /// - Multiple entries → driver sends a proper `GetAccountsResponse`.
    pub accounts: Vec<AccountFetchConfig>,
}

impl FetchConfig {
    /// Single account, no neurons, NNS account not found.
    /// This is the standard happy-path scenario.
    pub fn single_no_neurons() -> Self {
        Self {
            accounts: vec![AccountFetchConfig {
                delegation_key: TEST_DELEGATION_KEY_1.to_vec(),
                neuron_ids: vec![],
                neurons_responses: vec![],
                nns_account: NnsAccountKind::NotFound,
            }],
        }
    }

    /// Two accounts, no neurons, NNS account not found for both.
    pub fn two_accounts_no_neurons() -> Self {
        Self {
            accounts: vec![
                AccountFetchConfig {
                    delegation_key: TEST_DELEGATION_KEY_1.to_vec(),
                    neuron_ids: vec![],
                    neurons_responses: vec![],
                    nns_account: NnsAccountKind::NotFound,
                },
                AccountFetchConfig {
                    delegation_key: TEST_DELEGATION_KEY_2.to_vec(),
                    neuron_ids: vec![],
                    neurons_responses: vec![],
                    nns_account: NnsAccountKind::NotFound,
                },
            ],
        }
    }

    /// Single account with the given neuron IDs and paged responses, NNS account not found.
    ///
    /// Use this when a test drives through the full fetch phase with neurons but does not
    /// need real ledger balances (e.g. a happy-path neuron test).
    /// # Note
    /// This function is intentionally kept as a ready-to-use API for future neuron tests.
    /// Current tests that exercise neurons build their `ListNeuronsResponse` objects inline
    /// because they depend on `identity_principal` extracted from state after the delegation
    /// step.  Once a test needs this simpler path it can call this constructor directly.
    #[allow(dead_code)]
    pub fn single_with_neurons(
        neuron_ids: Vec<u64>,
        neurons_responses: Vec<ListNeuronsResponse>,
    ) -> Self {
        Self {
            accounts: vec![AccountFetchConfig {
                delegation_key: TEST_DELEGATION_KEY_1.to_vec(),
                neuron_ids,
                neurons_responses,
                nns_account: NnsAccountKind::NotFound,
            }],
        }
    }

    /// Single account with 1 neuron (empty response) and 3 real NNS sub-accounts.
    ///
    /// Produces a realistic `AccountDetails` with deposited ledger balances, which
    /// is required by tests that exercise the check-assets approval-detection logic.
    pub fn single_with_test_sub_accounts() -> Self {
        Self {
            accounts: vec![AccountFetchConfig {
                delegation_key: TEST_DELEGATION_KEY_1.to_vec(),
                neuron_ids: vec![1u64],
                neurons_responses: vec![ListNeuronsResponse {
                    neuron_infos: vec![],
                    full_neurons: vec![],
                    total_pages_available: None,
                }],
                nns_account: NnsAccountKind::OkWithTestSubAccounts,
            }],
        }
    }
}

// ---------------------------------------------------------------------------
// Public driver helpers
// ---------------------------------------------------------------------------

/// Sends a `DelegationGot` event to the state machine from the hub canister.
///
/// This is a shorthand for the verbose `update_holder_with_lock(HolderProcessingEvent::Holding {
/// FetchAssets / ObtainDelegation / DelegationGot { ... } })` construction.
///
/// **Precondition:** state machine is in `GetDelegationWaiting`.
/// After this call the state is `GetNeuronsIds`.
pub(crate) fn send_delegation_got(delegation_key: Vec<u8>) {
    set_test_caller(ht_get_test_hub_canister());
    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::FetchAssets {
            event: FetchAssetsEvent::ObtainDelegation {
                event: ObtainDelegationEvent::DelegationGot {
                    delegation_data: DelegationData {
                        hostname: TEST_DELEGATION_HOSTNAME.to_owned(),
                        public_key: delegation_key.into(),
                        timestamp: TEST_DELEGATION_EXPIRATION as u128,
                        signature: vec![].into(),
                    },
                },
            },
        },
    })
    .expect("send_delegation_got: update_holder_with_lock failed");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Returns true when the state machine is currently in `DeletingNeuronsHotkeys`.
fn is_in_deleting_neurons_hotkeys() -> bool {
    get_holder_model(|_, model| {
        matches!(
            &model.state.value,
            HolderState::Holding {
                sub_state: HoldingState::FetchAssets {
                    fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                        sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                            sub_state: FetchNnsAssetsState::DeletingNeuronsHotkeys { .. },
                            ..
                        },
                    },
                    ..
                }
            }
        )
    })
}

/// Returns true when the state machine is currently in `GetAccountsBalances`.
fn is_in_get_accounts_balances() -> bool {
    get_holder_model(|_, model| {
        matches!(
            &model.state.value,
            HolderState::Holding {
                sub_state: HoldingState::FetchAssets {
                    fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                        sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                            sub_state: FetchNnsAssetsState::GetAccountsBalances,
                            ..
                        },
                    },
                    ..
                }
            }
        )
    })
}

/// Drives one NNS account from `NeedPrepareDelegation` through to the next
/// account's `NeedPrepareDelegation` (or `FinishFetchAssets` if this was the last).
///
/// No `test_state_matches!` assertions — pure navigation.
async fn drive_nns_account(config: &AccountFetchConfig) {
    // --- NeedPrepareDelegation → GetDelegationWaiting ---
    mock_prepare_delegation_ok(config.delegation_key.clone());
    super::super::tick().await;

    // --- Deliver delegation via update_holder_with_lock ---
    set_test_caller(ht_get_test_hub_canister());
    assert!(
        update_holder_with_lock(HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::ObtainDelegation {
                    event: ObtainDelegationEvent::DelegationGot {
                        delegation_data: DelegationData {
                            hostname: TEST_DELEGATION_HOSTNAME.to_owned(),
                            public_key: config.delegation_key.clone().into(),
                            timestamp: TEST_DELEGATION_EXPIRATION as u128,
                            signature: vec![].into(),
                        },
                    },
                },
            },
        })
        .is_ok(),
        "drive_nns_account: update_holder_with_lock(DelegationGot) failed"
    );
    // State: GetNeuronsIds

    // --- GetNeuronsIds ---
    if config.neuron_ids.is_empty() {
        // Empty list → state machine skips GetNeuronsInformation entirely
        // and goes directly to GetAccountsInformation.
        mock_neuron_ids_empty();
        super::super::tick().await;
        // State: GetAccountsInformation
    } else {
        // Non-empty → enters GetNeuronsInformation, fetches pages, then DeletingNeuronsHotkeys.
        mock_neuron_ids(config.neuron_ids.clone());
        super::super::tick().await;
        // State: GetNeuronsInformation

        // Send each paged neurons response.
        for response in &config.neurons_responses {
            mock_neurons_response(response);
            super::super::tick().await;
            // State: GetNeuronsInformation (may still be looping over pages)
        }

        // One extra tick (no new response) transitions out of GetNeuronsInformation
        // into DeletingNeuronsHotkeys.
        super::super::tick().await;

        // Drain DeletingNeuronsHotkeys — one tick per hotkey batch until gone.
        while is_in_deleting_neurons_hotkeys() {
            super::super::tick().await;
        }
        // State: GetAccountsInformation
    }

    // --- GetAccountsInformation: dispatch NNS account mock ---
    match &config.nns_account {
        NnsAccountKind::NotFound => {
            mock_account_not_found();
        }
        NnsAccountKind::OkWithTestSubAccounts => {
            // Read the identity principal established during delegation.
            let identity_principal =
                get_holder_model(|_, model| model.get_delegation_controller().unwrap());

            let zero_subaccount = [0u8; 32];

            // Build 3 sub-accounts with deposited ledger balances.
            let sub_accounts: Vec<SubAccountDetails> = (1u8..4)
                .map(|i| {
                    let mut msubaccount = zero_subaccount;
                    msubaccount[31] = 4 - i;
                    let account_identifier =
                        AccountIdentifier::new(&identity_principal, &Subaccount(msubaccount));
                    // Deposit a distinct amount so each sub-account has a non-zero balance.
                    ht_deposit_account(&account_identifier, 5_000_000 + i as u64 * 1_000);
                    SubAccountDetails {
                        name: format!("SubAccount{}", i + 1),
                        sub_account: msubaccount.to_vec().into(),
                        account_identifier: account_identifier.to_hex(),
                    }
                })
                .collect();

            mock_account_ok(AccountDetails {
                principal: identity_principal,
                account_identifier: AccountIdentifier::new(
                    &identity_principal,
                    &Subaccount(zero_subaccount),
                )
                .to_hex(),
                hardware_wallet_accounts: vec![],
                sub_accounts,
            });
        }
    }
    // Tick: GetAccountsInformation → GetAccountsBalances
    super::super::tick().await;
    // State: GetAccountsBalances

    // Drain GetAccountsBalances — one tick per sub-account batch until done.
    // For NotFound (1 account):         1 tick → exit.
    // For OkWithTestSubAccounts (4):    HT_SEQUENTIAL_CHECK_STEPS ticks → exit.
    while is_in_get_accounts_balances() {
        super::super::tick().await;
    }
    // State: FinishCurrentNnsAccountFetch

    // --- FinishCurrentNnsAccountFetch → next account's NeedPrepareDelegation or FinishFetchAssets ---
    super::super::tick().await;
}

/// Builds a `GetAccountsResponse` from the given account list.
/// First account → `account_number: None` (default), subsequent → `Some(n)` starting at 1.
fn build_accounts_response(accounts: &[AccountFetchConfig]) -> GetAccountsResponse {
    let account_infos: Vec<AccountInfo> = accounts
        .iter()
        .enumerate()
        .map(|(i, _)| AccountInfo {
            account_number: if i == 0 { None } else { Some(i as u64) },
            origin: "nns.ic0.app".to_string(),
            last_used: None,
            name: if i == 0 {
                None
            } else {
                Some(format!("Account {i}"))
            },
        })
        .collect();
    GetAccountsResponse {
        accounts: account_infos,
        default_account: 0,
    }
}

// ---------------------------------------------------------------------------
// Public driver API
// ---------------------------------------------------------------------------

/// Drives the state machine from `FetchAssets::StartFetchAssets` to
/// `FetchAssets::FinishFetchAssets` (does not enter CheckAssets).
///
/// Assumes the state machine is already in `StartFetchAssets`.
/// No `test_state_matches!` assertions inside — pure navigation.
pub(crate) async fn drive_to_finish_fetch_assets(config: &FetchConfig) {
    // StartFetchAssets → GetIdentityAccounts
    super::super::tick().await;

    // GetIdentityAccounts: respond based on account count
    if config.accounts.len() <= 1 {
        // Single account: send NoAccounts — state machine uses the one default NNS account
        mock_identity_accounts_no_accounts();
    } else {
        // Multiple accounts: send the full list
        mock_identity_accounts_ok(build_accounts_response(&config.accounts));
    }
    super::super::tick().await;
    // State: NeedPrepareDelegation (for first account)

    // Process each account
    for account in &config.accounts {
        drive_nns_account(account).await;
    }
    // State: FinishFetchAssets
}

/// Drives the state machine from `FetchAssets::StartFetchAssets` all the way through
/// to `CheckAssets::FinishCheckAssets`.
///
/// Assumes `drive_to_captured` has already been called (state is `StartFetchAssets`).
/// No `test_state_matches!` assertions inside — pure navigation.
pub(crate) async fn drive_to_check_assets_finished(config: &FetchConfig) {
    drive_to_finish_fetch_assets(config).await;
    // State: FinishFetchAssets

    // FinishFetchAssets → StartCheckAssets
    super::super::tick().await;

    // StartCheckAssets → CheckAccountsForNoApprovePrepare
    super::super::tick().await;

    // Sequential sub-account checks.
    // The loop runs HT_SEQUENTIAL_CHECK_STEPS + 1 times:
    //   - iteration 0   : CheckAccountsForNoApprovePrepare → Sequential (first sub-account)
    //   - iterations 1‥4: advance through remaining sub-accounts (including main sub-account 0)
    // One extra tick after the loop transitions to FinishCheckAssets.
    for _ in 0..=HT_SEQUENTIAL_CHECK_STEPS {
        super::super::tick().await;
        // State: CheckAccountsForNoApproveSequential
    }

    // Final tick → FinishCheckAssets
    super::super::tick().await;
    // State: FinishCheckAssets
}

/// Full path: initialise + capture + fetch + check + enter Hold.
///
/// After this call the state machine is in:
/// `HolderState::Holding { sub_state: HoldingState::Hold { .. } }`
///
/// No `test_state_matches!` assertions inside — pure navigation.
pub(crate) async fn drive_to_hold(
    certificate_expiration: TimestampMillis,
    owner: Principal,
    identity_number: u64,
    config: &FetchConfig,
) {
    drive_to_captured(certificate_expiration, owner, identity_number).await;
    drive_to_check_assets_finished(config).await;

    // FinishCheckAssets → StartHolding
    super::super::tick().await;

    // StartHolding → Hold
    super::super::tick().await;
}
