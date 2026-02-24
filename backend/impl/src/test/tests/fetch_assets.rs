use std::ops::Deref;

use candid::{Encode, Principal};
use common_canister_impl::components::{
    identity::api::{
        AccountInfo, Delegation, GetAccountsError, GetAccountsResponse, GetDelegationResponse,
        PrepareAccountDelegation, PrepareAccountDelegationRet, SignedDelegation,
    },
    nns::api::{ListNeuronsResponse, Neuron, NeuronId},
    nns_dap::api::{AccountDetails, GetAccountResponse, SubAccountDetails},
};
use common_canister_types::{LedgerAccount, TimestampMillis, TokenE8s};
use contract_canister_api::{
    receive_delegation::ReceiveDelegationError,
    retry_prepare_delegation::RetryPrepareDelegationError,
    types::holder::{
        CancelSaleDealState, CheckAssetsState, DelegationData, DelegationState, FetchAssetsEvent,
        FetchAssetsState, FetchIdentityAccountsNnsAssetsState, FetchNnsAssetsState,
        HolderProcessingError, HolderProcessingEvent, HolderState, HoldingProcessingEvent,
        HoldingState, LimitFailureReason, ObtainDelegationEvent, UnsellableReason,
    },
};
use ic_ledger_types::{AccountIdentifier, Subaccount};

use crate::{
    handlers::holder::{processor::update_holder_with_lock, states::get_holder_model},
    print_holder_state, read_state, result_err_matches, result_ok_with_holder_information,
    test::tests::{
        components::{
            ic::set_test_caller, ic_agent::set_test_ic_agent_response, time::set_test_time,
        },
        holder_auth_registration::ht_capture_identity,
        ht_get_test_deployer, ht_get_test_hub_canister, ht_get_test_other,
        HT_CAPTURED_IDENTITY_NUMBER, HT_MIN_PRICE, HT_QUARANTINE_DURATION,
        HT_SALE_DEAL_SAFE_CLOSE_DURATION,
    },
    test_state_extract_neuron_hotkeys, test_state_matches,
    updates::holder::{
        receive_delegation::receive_delegation_int,
        retry_prepare_delegation::retry_prepare_delegation_int,
        set_sale_intention::set_sale_intention_int, set_sale_offer::set_sale_offer_int,
    },
};

#[tokio::test]
async fn test_fetch_assets_fail_certificate_expired() {
    ht_capture_identity(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::GetIdentityAccounts,
            },
            ..
        }
    });

    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION + 1);
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });
}

#[tokio::test]
async fn test_fetch_assets() {
    ht_capture_identity_and_fetch_assets(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;
}

#[tokio::test]
async fn test_fetch_assets_with_neuron_limit() {
    let certificate_expiration = 2 * 24 * 60 * 60 * 1000;
    let contract_owner = ht_get_test_deployer();
    let identity_number = HT_CAPTURED_IDENTITY_NUMBER;
    ht_capture_identity(certificate_expiration, contract_owner, identity_number).await;
    ht_fetch_assets_with_neuron_limit().await;
}

#[tokio::test]
async fn test_fetch_assets_with_account_limit() {
    let certificate_expiration = 2 * 24 * 60 * 60 * 1000;
    let contract_owner = ht_get_test_deployer();
    let identity_number = HT_CAPTURED_IDENTITY_NUMBER;
    ht_capture_identity(certificate_expiration, contract_owner, identity_number).await;
    ht_fetch_assets_with_account_limit().await;
}

pub(crate) async fn ht_capture_identity_and_fetch_assets(
    certificate_expiration: TimestampMillis,
    contract_owner: Principal,
    identity_number: u64,
) {
    ht_capture_identity(certificate_expiration, contract_owner, identity_number).await;
    ht_fetch_assets().await;

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

    set_test_ic_agent_response(Encode!(&1u8).unwrap());
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
    read_state(|state| {
        let processing_error = state
            .get_model()
            .get_holder()
            .get_holder_model()
            .processing_error
            .clone()
            .unwrap()
            .value;

        assert!(matches!(
            processing_error,
            HolderProcessingError::InternalError { .. }
        ));

        let idx = state.get_model().get_holder().get_events_len();
        let last_error = match &state
            .get_model()
            .get_holder()
            .get_event(idx - 1)
            .unwrap()
            .value
        {
            HolderProcessingEvent::ProcessingError { error } => error.clone(),
            _ => panic!(),
        };

        assert_eq!(processing_error, last_error);
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

    set_test_ic_agent_response(Encode!(&vec![1u64, 2u64, 3u64, 4u64]).unwrap());
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
            full_neurons: vec![
                fake_neuron(1, None, vec![]),
                fake_neuron(2, Some(Principal::management_canister()), vec![]),
                fake_neuron(3, Some(identity_principal), vec![]),
                fake_neuron(
                    4,
                    Some(identity_principal),
                    vec![Principal::management_canister()]
                )
            ],
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

    let neuron_hot_keys = test_state_extract_neuron_hotkeys!();

    get_holder_model(|_, model| {
        let controlled_neurons = &model
            .fetching_nns_assets
            .as_ref()
            .unwrap()
            .controlled_neurons
            .as_ref()
            .unwrap()
            .value;

        assert_eq!(controlled_neurons.get(0).unwrap().neuron_id, 3);
        assert_eq!(controlled_neurons.get(1).unwrap().neuron_id, 4);
        assert_eq!(neuron_hot_keys[0].1[0], Principal::management_canister());
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
    let neuron_hot_keys = test_state_extract_neuron_hotkeys!();
    get_holder_model(|_, model| {
        let controlled_neurons = &model
            .fetching_nns_assets
            .as_ref()
            .unwrap()
            .controlled_neurons
            .as_ref()
            .unwrap()
            .value;

        println!("controlled_neurons: {controlled_neurons:?}");
        println!("pending neuron hotkey list: {neuron_hot_keys:?}");
        assert_eq!(controlled_neurons.get(0).unwrap().neuron_id, 3);
        assert_eq!(controlled_neurons.get(1).unwrap().neuron_id, 4);
        assert_eq!(neuron_hot_keys.len(), 0);
    });

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

    set_test_ic_agent_response(Encode!(&GetAccountResponse::AccountNotFound).unwrap());
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
        crate::handlers::holder::processor::process_holder_with_lock().await;
        test_state_matches!(HolderState::Holding {
            sub_state: HoldingState::CheckAssets {
                sub_state: CheckAssetsState::CheckAccountsForNoApproveSequential { .. },
                ..
            }
        });
    }

    print_holder_state!();
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::FinishCheckAssets,
            ..
        }
    });
}

pub(crate) async fn ht_fetch_assets_with_account_limit() {
    ht_fetch_assets_with_limit_common().await;

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

    set_test_ic_agent_response(
        Encode!(&ListNeuronsResponse {
            neuron_infos: vec![],
            full_neurons: vec![fake_neuron(1, None, vec![]),],
            total_pages_available: None
        })
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    //print the state for debug
    get_holder_model(|_, model| println!("State after processing: {:?}", model.state.value));

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
    let identity_principal =
        get_holder_model(|_, model| model.get_delegation_controller().unwrap());
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
            sub_accounts: (1..10)
                .map(|i| {
                    let mut msubaccount = subaccount.clone();
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
                .collect()
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CheckLimitFailed {
                reason: LimitFailureReason::TooManyAccounts
            }
        },
    });
}

pub(crate) async fn ht_fetch_assets_with_neuron_limit() {
    ht_fetch_assets_with_limit_common().await;

    set_test_ic_agent_response(
        Encode!(&vec![
            1u64, 2u64, 3u64, 4u64, 5u64, 6u64, 7u64, 8u64, 9u64, 10u64, 11u64, 12u64, 13u64,
            14u64, 15u64, 16u64
        ])
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

    let identity_principal =
        get_holder_model(|_, model| model.get_delegation_controller().unwrap());

    set_test_ic_agent_response(
        Encode!(&ListNeuronsResponse {
            neuron_infos: vec![],
            full_neurons: vec![
                fake_neuron(1, None, vec![]),
                fake_neuron(2, Some(Principal::management_canister()), vec![]),
                fake_neuron(3, Some(identity_principal), vec![]),
                fake_neuron(
                    4,
                    Some(identity_principal),
                    vec![Principal::management_canister()]
                )
            ],
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

    set_test_ic_agent_response(
        Encode!(&ListNeuronsResponse {
            neuron_infos: vec![],
            full_neurons: vec![
                fake_empty_neuron(5, None, vec![]),
                fake_neuron(6, Some(identity_principal), vec![]),
                fake_empty_neuron(7, Some(identity_principal), vec![]),
                fake_neuron(
                    8,
                    Some(identity_principal),
                    vec![Principal::management_canister()]
                )
            ],
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

    set_test_ic_agent_response(
        Encode!(&ListNeuronsResponse {
            neuron_infos: vec![],
            full_neurons: vec![
                fake_neuron(9, Some(identity_principal), vec![]),
                fake_neuron(10, Some(identity_principal), vec![]),
                fake_empty_neuron(11, Some(identity_principal), vec![]),
                fake_neuron(
                    12,
                    Some(identity_principal),
                    vec![Principal::management_canister()]
                )
            ],
            total_pages_available: None
        })
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CheckLimitFailed {
                reason: LimitFailureReason::TooManyNeurons
            }
        },
    });
}

pub(crate) async fn ht_fetch_assets_with_limit_common() {
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
}

fn fake_empty_neuron(id: u64, controller: Option<Principal>, hot_keys: Vec<Principal>) -> Neuron {
    _fake_neuron_int(id, controller, hot_keys, 0)
}

fn fake_neuron(id: u64, controller: Option<Principal>, hot_keys: Vec<Principal>) -> Neuron {
    _fake_neuron_int(id, controller, hot_keys, 12)
}

fn _fake_neuron_int(
    id: u64,
    controller: Option<Principal>,
    hot_keys: Vec<Principal>,
    value: TokenE8s,
) -> Neuron {
    let (staked_maturity_e8s_equivalent, maturity_e8s_equivalent, cached_neuron_stake_e8s) =
        if value == 0 {
            (None, 0, 0)
        } else {
            (Some(value), value + 1, value + 2)
        };
    Neuron {
        id: Some(NeuronId { id }),
        staked_maturity_e8s_equivalent,
        controller,
        recent_ballots: vec![],
        voting_power_refreshed_timestamp_seconds: None,
        kyc_verified: true,
        potential_voting_power: None,
        neuron_type: None,
        not_for_profit: true,
        maturity_e8s_equivalent,
        deciding_voting_power: None,
        cached_neuron_stake_e8s,
        created_timestamp_seconds: 1111,
        auto_stake_maturity: None,
        aging_since_timestamp_seconds: 22222,
        hot_keys,
        account: vec![1].into(),
        joined_community_fund_timestamp_seconds: None,
        dissolve_state: None,
        followees: vec![],
        neuron_fees_e8s: 0,
        visibility: None,
        transfer: None,
        known_neuron_data: None,
        spawn_at_timestamp_seconds: None,
    }
}

#[tokio::test]
async fn test_fetch_assets_multiple_accounts() {
    ht_capture_identity(
        2 * 24 * 60 * 60 * 1000,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    ht_fetch_assets_multiple_accounts().await;

    // FinishCheckAssets → StartHolding (assets не сохранены в model.assets ещё)
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::StartHolding
    });
    get_holder_model(|_, model| {
        assert!(model.assets.is_none());
        assert!(model.fetching_assets.is_some());
        let nns_assets = model
            .fetching_assets
            .as_ref()
            .unwrap()
            .nns_assets
            .as_ref()
            .unwrap();
        assert_eq!(nns_assets.len(), 2, "should have 2 identity account slots");
        assert!(
            nns_assets[0].assets.is_some(),
            "default account (None) should have fetched assets"
        );
        assert!(
            nns_assets[1].assets.is_some(),
            "account Some(1) should have fetched assets"
        );
    });

    // StartHolding → Hold (assets сохраняются в model.assets)
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
        let nns_assets = model
            .assets
            .as_ref()
            .unwrap()
            .value
            .nns_assets
            .as_ref()
            .unwrap();
        assert_eq!(
            nns_assets.len(),
            2,
            "assets should contain 2 identity accounts"
        );
        assert_eq!(
            nns_assets[0].identity_account_number, None,
            "first slot should be the default account"
        );
        assert_eq!(
            nns_assets[1].identity_account_number,
            Some(1),
            "second slot should be account #1"
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
            "accounts should have different principals (different delegation keys were used)"
        );
    });
}

/// Полный fetch-цикл для идентити с двумя аккаунтами: default (None) + аккаунт #1 (Some(1)).
/// Для каждого аккаунта используется пустой список нейронов (без цикла NNS) и AccountNotFound.
/// Заканчивается на CheckAssets::FinishCheckAssets, аналогично ht_fetch_assets.
pub(crate) async fn ht_fetch_assets_multiple_accounts() {
    // StartFetchAssets → GetIdentityAccounts
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::GetIdentityAccounts,
            },
            ..
        }
    });

    // GetIdentityAccounts: возвращаем 2 аккаунта — default (None) + account #1 (Some(1))
    set_test_ic_agent_response({
        let m: Result<GetAccountsResponse, GetAccountsError> = Ok(GetAccountsResponse {
            accounts: vec![
                AccountInfo {
                    account_number: None,
                    origin: "nns.ic0.app".to_string(),
                    last_used: None,
                    name: None,
                },
                AccountInfo {
                    account_number: Some(1),
                    origin: "nns.ic0.app".to_string(),
                    last_used: None,
                    name: None,
                },
            ],
            default_account: 0,
        });
        Encode!(&m).unwrap()
    });
    crate::handlers::holder::processor::process_holder_with_lock().await;
    // После IdentityAccountsGot — переходим к NeedPrepareDelegation для первого аккаунта (None)
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    identity_account_number: None,
                    sub_state: FetchNnsAssetsState::ObtainDelegationState {
                        sub_state: DelegationState::NeedPrepareDelegation {
                            identity_account_number: None,
                            ..
                        },
                        ..
                    },
                },
            },
            ..
        }
    });

    // --- Fetch NNS assets для аккаунта None (delegation key = vec![1]) ---
    ht_fetch_nns_for_account_no_neurons(vec![1u8]).await;

    // После завершения аккаунта None — переходим к NeedPrepareDelegation для аккаунта Some(1)
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                    identity_account_number: Some(1),
                    sub_state: FetchNnsAssetsState::ObtainDelegationState {
                        sub_state: DelegationState::NeedPrepareDelegation {
                            identity_account_number: Some(1),
                            ..
                        },
                        ..
                    },
                },
            },
            ..
        }
    });

    // --- Fetch NNS assets для аккаунта Some(1) (delegation key = vec![2]) ---
    ht_fetch_nns_for_account_no_neurons(vec![2u8]).await;

    // После завершения всех аккаунтов — переходим в FinishFetchAssets
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FinishFetchAssets,
            ..
        }
    });

    // FinishFetchAssets → CheckAssets::StartCheckAssets
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::StartCheckAssets,
            ..
        }
    });

    // CheckAssetsStarted → CheckAccountsForNoApprovePrepare
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::CheckAccountsForNoApprovePrepare,
            ..
        }
    });

    // Итерации проверки sub-аккаунтов.
    // У нас 2 аккаунта с разными principals, но одинаковыми sub_account байтами
    // ([0..0], [0..1]..[0..4]). retain() удаляет по sub_account байтам (игнорируя principal),
    // поэтому каждый шаг удаляет 2 элемента (по одному на каждый principal).
    // Итог: 5 unique sub_account значений → тот же цикл 0..=4, что и для 1 аккаунта.
    for _i in 0..=4 {
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

/// Вспомогательная функция: выполняет полный NNS-fetch для одного аккаунта,
/// начиная с состояния NeedPrepareDelegation.
/// Использует пустой список нейронов и AccountNotFound для упрощения.
/// После завершения стейт переходит либо к NeedPrepareDelegation следующего аккаунта,
/// либо к FinishFetchAssets (если аккаунты закончились) — проверяется вызывающей стороной.
async fn ht_fetch_nns_for_account_no_neurons(delegation_public_key: Vec<u8>) {
    // NeedPrepareDelegation → PrepareAccountDelegation response → GetDelegationWaiting
    set_test_ic_agent_response({
        let m: PrepareAccountDelegationRet = Ok(PrepareAccountDelegation {
            user_key: delegation_public_key.clone().into(),
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

    // Получаем делегацию через update_holder_with_lock
    set_test_caller(ht_get_test_hub_canister());
    assert!(update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::FetchAssets {
            event: FetchAssetsEvent::ObtainDelegation {
                event: ObtainDelegationEvent::DelegationGot {
                    delegation_data: DelegationData {
                        hostname: "a.b.c".to_owned(),
                        public_key: delegation_public_key.into(),
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

    // GetNeuronsIds: пустой список → сразу переходим к GetAccountsInformation (минуя нейроны)
    set_test_ic_agent_response(Encode!(&vec![] as &Vec<u64>).unwrap());
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

    // GetAccountsInformation: AccountNotFound → GetAccountsBalances
    set_test_ic_agent_response(Encode!(&GetAccountResponse::AccountNotFound).unwrap());
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

    // GetAccountsBalances: аккаунтов нет → сразу AccountsBalancesObtained → FinishCurrentNnsAccountFetch
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                sub_state: FetchIdentityAccountsNnsAssetsState::FinishCurrentNnsAccountFetch { .. },
            },
            ..
        }
    });

    // NnsAssetsForAccountFetched → следующий аккаунт или FinishFetchAssets (проверяет вызывающая сторона)
    crate::handlers::holder::processor::process_holder_with_lock().await;
}

#[tokio::test]
async fn test_refresh_assets() {
    let owner = ht_get_test_deployer();

    ht_capture_identity_and_fetch_assets(
        2 * 24 * 60 * 60 * 1000,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold { .. }
    });
}

#[tokio::test]
async fn test_retry_prepare_delegation() {
    // Capture identity but don't complete the fetch assets process
    let owner = ht_get_test_deployer();
    let other = ht_get_test_other();
    ht_capture_identity(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    // Process to reach the NeedPrepareDelegation state
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

    // Set caller to the contract owner
    set_test_caller(other);

    // Call retry_prepare_delegation
    let result = retry_prepare_delegation_int().await;
    result_err_matches!(result, RetryPrepareDelegationError::HolderWrongState);

    // Verify we're still in the same state but the retry was triggered
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

    // Now simulate successful delegation preparation
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

    // Call retry_prepare_delegation
    let result = retry_prepare_delegation_int().await;
    assert!(result.is_ok());
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

#[tokio::test]
async fn test_refetch_with_limit_failure_after_sale() {
    let test_identity_number = 779;
    ht_capture_identity_and_fetch_assets(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        test_identity_number,
    )
    .await;

    // call prepare sale
    set_test_caller(ht_get_test_deployer());
    let _ = set_sale_intention_int(LedgerAccount::Account {
        owner: ht_get_test_deployer(),
        subaccount: None,
    })
    .await;
    let result = set_sale_offer_int(HT_MIN_PRICE).await;
    let _ = result_ok_with_holder_information!(result);

    set_test_time(HT_QUARANTINE_DURATION + 1);
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    ht_fetch_assets_with_limit_common().await;
    set_test_ic_agent_response(
        Encode!(&vec![
            1u64, 2u64, 3u64, 4u64, 5u64, 6u64, 7u64, 8u64, 9u64, 10u64, 11u64, 12u64, 13u64,
            14u64, 15u64, 16u64
        ])
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

    let identity_principal =
        get_holder_model(|_, model| model.get_delegation_controller().unwrap());

    set_test_ic_agent_response(
        Encode!(&ListNeuronsResponse {
            neuron_infos: vec![],
            full_neurons: vec![
                fake_neuron(1, None, vec![]),
                fake_neuron(2, Some(Principal::management_canister()), vec![]),
                fake_neuron(3, Some(identity_principal), vec![]),
                fake_neuron(
                    4,
                    Some(identity_principal),
                    vec![Principal::management_canister()]
                )
            ],
            total_pages_available: None
        })
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    set_test_ic_agent_response(
        Encode!(&ListNeuronsResponse {
            neuron_infos: vec![],
            full_neurons: vec![
                fake_neuron(5, None, vec![]),
                fake_neuron(6, Some(identity_principal), vec![]),
                fake_neuron(7, Some(identity_principal), vec![]),
                fake_neuron(
                    8,
                    Some(identity_principal),
                    vec![Principal::management_canister()]
                )
            ],
            total_pages_available: None
        })
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    set_test_ic_agent_response(
        Encode!(&ListNeuronsResponse {
            neuron_infos: vec![],
            full_neurons: vec![
                fake_neuron(9, Some(identity_principal), vec![]),
                fake_neuron(10, Some(identity_principal), vec![]),
                fake_neuron(11, Some(identity_principal), vec![]),
                fake_neuron(
                    12,
                    Some(identity_principal),
                    vec![Principal::management_canister()]
                )
            ],
            total_pages_available: None
        })
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CancelSaleDeal { sub_state: CancelSaleDealState::StartCancelSaleDeal { .. }, wrap_holding_state}
    } if HoldingState::Unsellable { reason: UnsellableReason::CheckLimitFailed { reason: LimitFailureReason::TooManyNeurons } } == *wrap_holding_state.deref());
    crate::handlers::holder::processor::process_holder_with_lock().await;

    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CheckLimitFailed {
                reason: LimitFailureReason::TooManyNeurons
            }
        },
    });
}
