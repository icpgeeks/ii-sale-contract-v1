use std::{i32, u64};

use candid::{Encode, Principal};
use common_canister_impl::components::nns::api::{
    BallotInfo, DissolveState, Followees, ListNeuronsResponse, Neuron, NeuronId, NeuronInfo,
    NeuronStakeTransfer, ProposalId,
};
use contract_canister_api::types::holder::{
    CheckAssetsState, FetchAssetsState, HolderState, HoldingState, UnsellableReason,
};
use icrc_ledger_types::icrc1::account::Account;
use serde_bytes::ByteBuf;

use crate::{
    handlers::holder::states::get_holder_model,
    test::tests::{
        components::{allowance_ledger::ht_approve_account, time::set_test_time},
        drivers::{
            capture::drive_to_captured,
            fetch::{drive_to_finish_fetch_assets, FetchConfig},
            hold::drive_to_standard_hold,
        },
        ht_get_test_deployer, HT_CAPTURED_IDENTITY_NUMBER, HT_QUARANTINE_DURATION,
    },
    test_state_matches,
};

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/// Extracts the delegation-controller principal of the default identity account
/// (the one with `identity_account_number == None`) from `model.fetching_assets`.
///
/// **Precondition:** the state machine is in or just past `FinishFetchAssets` and
/// `fetching_assets` has not yet been cleared (i.e. before `StartHolding`).
fn ht_get_default_identity_principal_from_fetching_assets() -> Principal {
    get_holder_model(|_, model| {
        model
            .fetching_assets
            .as_ref()
            .and_then(|fa| fa.nns_assets.as_ref())
            .and_then(|accounts| {
                accounts
                    .iter()
                    .find(|a| a.identity_account_number.is_none())
            })
            .and_then(|account| account.principal)
            .expect("default identity account principal not found in fetching_assets")
    })
}

/// Advances the state machine one tick at a time (up to 10 ticks) until it lands in
/// `HoldingState::Unsellable`. Panics if `Unsellable` is not reached within the budget.
async fn tick_until_unsellable() {
    for _ in 0..10 {
        super::tick().await;
        let done = get_holder_model(|_, model| {
            matches!(
                &model.state.value,
                HolderState::Holding {
                    sub_state: HoldingState::Unsellable { .. }
                }
            )
        });
        if done {
            return;
        }
    }
    panic!("tick_until_unsellable: Unsellable state not reached within 10 ticks");
}

// ---------------------------------------------------------------------------
// test_check_assets_happy_path
// ---------------------------------------------------------------------------

/// Full happy-path: capture → fetch → check → Hold.
#[tokio::test]
async fn test_check_assets_happy_path() {
    drive_to_standard_hold(ht_get_test_deployer()).await;

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
// test_check_assets_have_approve
// ---------------------------------------------------------------------------

/// If any sub-account has an active allowance approval to the deployer,
/// the check phase detects it and transitions to Unsellable::ApproveOnAccount.
#[tokio::test]
async fn test_check_assets_have_approve() {
    // Reach StartFetchAssets
    drive_to_captured(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    // Drive through fetch phase, stopping at FinishFetchAssets.
    // Uses real sub-accounts with deposited balances so the check phase
    // has actual accounts to inspect for approvals.
    drive_to_finish_fetch_assets(&FetchConfig::single_with_test_sub_accounts()).await;
    // State: FinishFetchAssets

    // FinishFetchAssets → StartCheckAssets
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::StartCheckAssets,
            ..
        }
    });

    // Extract principal from fetching_assets before it's cleared
    let identity_principal = ht_get_default_identity_principal_from_fetching_assets();

    let subaccount = [0u8; 32];

    // Place zero-amount approvals on sub-accounts 2 and 3
    for i in 2u8..4 {
        let mut msubaccount = subaccount;
        msubaccount[31] = i;
        ht_approve_account(
            Account {
                owner: identity_principal,
                subaccount: Some(msubaccount),
            },
            Account {
                owner: ht_get_test_deployer(),
                subaccount: None,
            },
            0,
            0,
        );
    }

    // Non-zero approval on the main subaccount — triggers Unsellable
    ht_approve_account(
        Account {
            owner: identity_principal,
            subaccount: Some(subaccount),
        },
        Account {
            owner: ht_get_test_deployer(),
            subaccount: None,
        },
        0,
        1,
    );

    // StartCheckAssets → CheckAccountsForNoApprovePrepare
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::CheckAccountsForNoApprovePrepare,
            ..
        }
    });

    // Tick until Unsellable (sequential scan detects the approval)
    tick_until_unsellable().await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::ApproveOnAccount { .. }
        },
        ..
    });
}

// ---------------------------------------------------------------------------
// test_check_assets_have_approve_after_quarantine
// ---------------------------------------------------------------------------

/// Same scenario triggered during the quarantine re-fetch (second fetch cycle).
#[tokio::test]
async fn test_check_assets_have_approve_after_quarantine() {
    // First cycle: reach Hold normally
    drive_to_standard_hold(ht_get_test_deployer()).await;

    // Advance time past quarantine → re-fetch begins
    set_test_time(HT_QUARANTINE_DURATION + 1);
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::StartFetchAssets,
            ..
        }
    });

    // Second fetch: drive to FinishFetchAssets with real sub-accounts
    drive_to_finish_fetch_assets(&FetchConfig::single_with_test_sub_accounts()).await;
    // State: FinishFetchAssets

    // Extract principal from fetching_assets
    let identity_principal = ht_get_default_identity_principal_from_fetching_assets();

    let subaccount = [0u8; 32];

    // Place a non-zero approval → will trigger Unsellable during check
    ht_approve_account(
        Account {
            owner: identity_principal,
            subaccount: Some(subaccount),
        },
        Account {
            owner: ht_get_test_deployer(),
            subaccount: None,
        },
        0,
        1,
    );

    // FinishFetchAssets → StartCheckAssets
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::StartCheckAssets,
            ..
        }
    });

    // StartCheckAssets → CheckAccountsForNoApprovePrepare
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::CheckAccountsForNoApprovePrepare,
            ..
        }
    });

    // First sequential step
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::CheckAccountsForNoApproveSequential { .. },
            ..
        }
    });

    // Tick until Unsellable
    tick_until_unsellable().await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::ApproveOnAccount { .. }
        },
        ..
    });
}

// ---------------------------------------------------------------------------
// test_neuron_lists_length
// ---------------------------------------------------------------------------

/// Verifies that a maximally-sized `ListNeuronsResponse` candid-encodes within
/// the expected byte budget. This is a regression guard against unbounded growth.
#[tokio::test]
async fn test_neuron_lists_length() {
    let principal =
        Principal::from_text("6cbt4-ztfyf-7ldym-o2owg-geomw-bkgiy-uuzey-dq4ad-hsly3-txpo7-3qe")
            .unwrap();

    let make_ballots = || {
        (0..100)
            .map(|_| BallotInfo {
                vote: i32::MAX,
                proposal_id: Some(ProposalId { id: u64::MAX }),
            })
            .collect::<Vec<_>>()
    };

    let neuron = Neuron {
        id: Some(NeuronId { id: u64::MAX }),
        staked_maturity_e8s_equivalent: Some(u64::MAX),
        controller: Some(principal),
        recent_ballots: make_ballots(),
        voting_power_refreshed_timestamp_seconds: Some(u64::MAX),
        kyc_verified: true,
        potential_voting_power: Some(u64::MAX),
        neuron_type: Some(i32::MAX),
        not_for_profit: true,
        maturity_e8s_equivalent: u64::MAX,
        deciding_voting_power: Some(u64::MAX),
        cached_neuron_stake_e8s: u64::MAX,
        created_timestamp_seconds: u64::MAX,
        auto_stake_maturity: Some(true),
        aging_since_timestamp_seconds: u64::MAX,
        hot_keys: vec![
            principal, principal, principal, principal, principal, principal,
        ],
        account: ByteBuf::with_capacity(32),
        joined_community_fund_timestamp_seconds: Some(u64::MAX),
        dissolve_state: Some(DissolveState::DissolveDelaySeconds(u64::MAX)),
        followees: vec![
            (
                i32::MAX,
                Followees {
                    followees: vec![NeuronId { id: u64::MAX }],
                },
            ),
            (
                i32::MAX,
                Followees {
                    followees: vec![NeuronId { id: u64::MAX }],
                },
            ),
            (
                i32::MAX,
                Followees {
                    followees: vec![NeuronId { id: u64::MAX }],
                },
            ),
            (
                i32::MAX,
                Followees {
                    followees: vec![NeuronId { id: u64::MAX }],
                },
            ),
            (
                i32::MAX,
                Followees {
                    followees: vec![NeuronId { id: u64::MAX }],
                },
            ),
        ],
        neuron_fees_e8s: u64::MAX,
        visibility: Some(i32::MAX),
        transfer: Some(NeuronStakeTransfer {
            to_subaccount: ByteBuf::with_capacity(32),
            neuron_stake_e8s: u64::MAX,
            from: Some(principal),
            memo: u64::MAX,
            from_subaccount: ByteBuf::with_capacity(32),
            transfer_timestamp: u64::MAX,
            block_height: u64::MAX,
        }),
        known_neuron_data: None,
        spawn_at_timestamp_seconds: Some(u64::MAX),
    };

    let info = NeuronInfo {
        dissolve_delay_seconds: u64::MAX,
        recent_ballots: make_ballots(),
        voting_power_refreshed_timestamp_seconds: Some(u64::MAX),
        potential_voting_power: Some(u64::MAX),
        neuron_type: Some(i32::MAX),
        deciding_voting_power: Some(u64::MAX),
        created_timestamp_seconds: u64::MAX,
        state: i32::MAX,
        stake_e8s: u64::MAX,
        joined_community_fund_timestamp_seconds: Some(u64::MAX),
        retrieved_at_timestamp_seconds: u64::MAX,
        visibility: Some(i32::MAX),
        known_neuron_data: None,
        voting_power: u64::MAX,
        age_seconds: u64::MAX,
    };

    let response = ListNeuronsResponse {
        neuron_infos: vec![(1, info)],
        full_neurons: vec![neuron],
        total_pages_available: Some(1),
    };

    let slice = Encode!(&response).unwrap();
    assert_eq!(slice.len(), 3612);
}
