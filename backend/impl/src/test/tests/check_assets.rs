use std::{i32, u64};

use candid::{Encode, Principal};
use common_canister_impl::components::{
    identity::api::{
        Delegation, GetAccountsError, GetAccountsResponse, GetDelegationResponse,
        PrepareAccountDelegation, PrepareAccountDelegationRet, SignedDelegation,
    },
    nns::api::{
        BallotInfo, DissolveState, Followees, ListNeuronsResponse, Neuron, NeuronId, NeuronInfo,
        NeuronStakeTransfer, ProposalId,
    },
    nns_dap::api::{AccountDetails, GetAccountResponse, SubAccountDetails},
};
use common_canister_types::TimestampMillis;
use contract_canister_api::{
    receive_delegation::ReceiveDelegationError,
    types::holder::{
        CheckAssetsState, DelegationData, DelegationState, FetchAssetsEvent, FetchAssetsState,
        FetchIdentityAccountsNnsAssetsState, FetchNnsAssetsState, HolderProcessingEvent,
        HolderState, HoldingProcessingEvent, HoldingState, ObtainDelegationEvent, UnsellableReason,
    },
};
use ic_ledger_types::{AccountIdentifier, Subaccount};
use icrc_ledger_types::icrc1::account::Account;
use serde_bytes::ByteBuf;

use crate::{
    handlers::holder::{processor::update_holder_with_lock, states::get_holder_model},
    result_err_matches,
    test::tests::{
        components::{
            allowance_ledger::ht_approve_account, ic::set_test_caller,
            ic_agent::set_test_ic_agent_response, ledger::ht_deposit_account, time::set_test_time,
        },
        holder_auth_registration::ht_capture_identity,
        ht_get_test_deployer, ht_get_test_hub_canister, HT_CAPTURED_IDENTITY_NUMBER,
        HT_QUARANTINE_DURATION,
    },
    test_state_matches,
    updates::holder::receive_delegation::receive_delegation_int,
};

#[tokio::test]
async fn test_check_assets_happy_path() {
    ht_capture_identity_and_fetch_assets_common(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;
}

#[tokio::test]
async fn test_check_assets_have_approve() {
    ht_capture_identity(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;
    ht_fetch_assets().await;

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::StartCheckAssets,
            ..
        }
    });

    let identity_principal = get_holder_model(|_, model| {
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
            .unwrap()
    });

    let subaccount = [0u8; 32];
    for i in 2..4 {
        let mut msubaccount = subaccount.clone();
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
        )
    }
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

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::CheckAccountsForNoApprovePrepare,
            ..
        }
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::ApproveOnAccount { .. }
        },
        ..
    });
}

#[tokio::test]
async fn test_check_assets_have_approve_after_quarantine() {
    ht_capture_identity_and_fetch_assets_common(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_time(HT_QUARANTINE_DURATION + 1);
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::StartFetchAssets,
            ..
        }
    });

    ht_fetch_assets().await;

    let identity_principal = get_holder_model(|_, model| {
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
            .unwrap()
    });
    let subaccount = [0u8; 32];
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

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::StartCheckAssets,
            ..
        }
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::CheckAccountsForNoApprovePrepare,
            ..
        }
    });
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::CheckAccountsForNoApproveSequential { .. },
            ..
        }
    });
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::ApproveOnAccount { .. }
        },
        ..
    });
}

pub(crate) async fn ht_capture_identity_and_fetch_assets_common(
    certificate_expiration: TimestampMillis,
    contract_owner: Principal,
    identity_number: u64,
) {
    ht_capture_identity(certificate_expiration, contract_owner, identity_number).await;
    ht_fetch_assets().await;
    ht_check_assets().await;

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::StartHolding
    });
    get_holder_model(|_, model| {
        assert!(model.assets.is_none());
        assert!(model.fetching_assets.is_some());
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: None
        }
    });
    get_holder_model(|_, model| {
        assert!(model.assets.is_some());
        assert!(model.fetching_assets.is_none());
    });
}

pub(crate) async fn ht_fetch_assets() {
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::GetIdentityAccounts,
            },
            ..
        }
    });

    set_test_ic_agent_response({
        let m: Result<GetAccountsResponse, GetAccountsError> = Err(GetAccountsError::NoAccounts);
        Encode!(&m).unwrap()
    });
    crate::handlers::holder::processor::process_holder_with_lock().await;
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

    set_test_ic_agent_response({
        let m: PrepareAccountDelegationRet = Ok(PrepareAccountDelegation {
            user_key: vec![1u8].into(),
            expiration: 234213412341234u64,
        });
        Encode!(&m).unwrap()
    });
    crate::handlers::holder::processor::process_holder_with_lock().await;
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

    set_test_caller(ht_get_test_hub_canister());

    result_err_matches!(
        receive_delegation_int(Encode!(&GetDelegationResponse::NoSuchDelegation).unwrap()).await,
        ReceiveDelegationError::ResponseNotContainsDelegation
    );

    let get_delegation_response =
        Encode!(&GetDelegationResponse::SignedDelegation(SignedDelegation {
            signature: vec![].into(),
            delegation: Delegation {
                pubkey: vec![].into(),
                targets: None,
                expiration: 234213412341234
            }
        }))
        .unwrap();

    result_err_matches!(
        receive_delegation_int(get_delegation_response).await,
        ReceiveDelegationError::DelegationWrong { .. }
    );

    assert!(update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::FetchAssets {
            event: FetchAssetsEvent::ObtainDelegation {
                event: ObtainDelegationEvent::DelegationGot {
                    delegation_data: DelegationData {
                        hostname: "a.b.c".to_owned(),
                        public_key: vec![1].into(),
                        timestamp: 234213412341234,
                        signature: vec![].into(),
                    },
                },
            },
        },
    })
    .is_ok());

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetNeuronsIds,
                    ..
                },
            },
            ..
        }
    });

    set_test_ic_agent_response(Encode!(&vec![1u64]).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetNeuronsInformation { .. },
                    ..
                },
            },
            ..
        }
    });

    let identity_principal =
        get_holder_model(|_, model| model.get_delegation_controller().unwrap());

    set_test_ic_agent_response(
        Encode!(&ListNeuronsResponse {
            neuron_infos: vec![],
            full_neurons: vec![],
            total_pages_available: None
        })
        .unwrap(),
    );

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetNeuronsInformation { .. },
                    ..
                },
            },
            ..
        }
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::DeletingNeuronsHotkeys { .. },
                    ..
                },
            },
            ..
        }
    });

    let subaccount = [0u8; 32];
    set_test_ic_agent_response(
        Encode!(&GetAccountResponse::Ok(AccountDetails {
            principal: identity_principal,
            account_identifier: AccountIdentifier::new(
                &identity_principal,
                &Subaccount(subaccount)
            )
            .to_hex(),
            hardware_wallet_accounts: vec![],
            sub_accounts: (1..4)
                .map(|i| {
                    let mut msubaccount = subaccount.clone();
                    msubaccount[31] = 4 - i;
                    let account_identifier =
                        AccountIdentifier::new(&identity_principal, &Subaccount(msubaccount));
                    ht_deposit_account(&account_identifier, 5_000_000 + i as u64 * 1_000);
                    SubAccountDetails {
                        name: format!("SubAccount{}", i + 1),
                        sub_account: msubaccount.to_vec().into(),
                        account_identifier: account_identifier.to_hex(),
                    }
                })
                .collect()
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetAccountsInformation,
                    ..
                },
            },
            ..
        }
    });
    for i in 0..=4 {
        println!("Processing fetch account balance {}", i);
        // fetch all 5 accounts balances
        crate::handlers::holder::processor::process_holder_with_lock().await;
        test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::FetchAssets {
                fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                    sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                        sub_state: FetchNnsAssetsState::GetAccountsBalances,
                        ..
                    },
                },
                ..
            }
        });
    }

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FinishCurrentNnsAccountFetch { .. },
            },
            ..
        }
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FinishFetchAssets,
            ..
        }
    });
}

pub async fn ht_check_assets() {
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::StartCheckAssets,
            ..
        }
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::CheckAccountsForNoApprovePrepare,
            ..
        }
    });

    for _i in 0..=4 {
        // fetch all 5 accounts balances
        crate::handlers::holder::processor::process_holder_with_lock().await;
        test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::CheckAssets {
                sub_state: CheckAssetsState::CheckAccountsForNoApproveSequential { .. },
                ..
            }
        });
    }

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::FinishCheckAssets,
            ..
        }
    });
}

#[tokio::test]
async fn test_neuron_lists_length() {
    let mut recent_ballots = Vec::new();
    for _ in 0..100 {
        recent_ballots.push(BallotInfo {
            vote: i32::MAX,
            proposal_id: Some(ProposalId { id: u64::MAX }),
        });
    }

    let principal =
        Principal::from_text("6cbt4-ztfyf-7ldym-o2owg-geomw-bkgiy-uuzey-dq4ad-hsly3-txpo7-3qe")
            .unwrap();

    let neuron = Neuron {
        id: Some(NeuronId { id: u64::MAX }),
        staked_maturity_e8s_equivalent: Some(u64::MAX),
        controller: Some(principal),
        recent_ballots,
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

    let mut recent_ballots = Vec::new();
    for _ in 0..100 {
        recent_ballots.push(BallotInfo {
            vote: i32::MAX,
            proposal_id: Some(ProposalId { id: u64::MAX }),
        });
    }

    let info = NeuronInfo {
        dissolve_delay_seconds: u64::MAX,
        recent_ballots,
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
