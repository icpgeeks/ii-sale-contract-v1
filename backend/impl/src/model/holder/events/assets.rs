use std::collections::{BTreeMap, HashSet};

use common_canister_types::{TimestampMillis, Timestamped};
use contract_canister_api::types::holder::{
    CancelSaleDealState, FetchAssetsEvent, FetchAssetsState, FetchIdentityAccountsNnsAssetsState,
    FetchNnsAssetsState, HolderState, HoldingState, IdentityAccountNnsAssets, LimitFailureReason,
    NeuronAsset, NeuronInformation, NnsHolderAssets, UnsellableReason,
};

use crate::model::holder::{HolderAssets, HolderModel, UpdateHolderError};

use super::delegation::handle_delegation_event;

#[macro_export]
macro_rules! assets_state_matches {
    ($expression:expr, $pattern:pat $(if $guard:expr)? $(,)?) => {
        match & $expression.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::FetchAssets {
                        fetch_assets_state: $pattern $(if $guard)?,
                        wrap_holding_state,
                    },
            }
             => { wrap_holding_state.clone() },
            _ => { return Err(UpdateHolderError::WrongState); }
        }
    };
}

fn neuron_is_empty(info: &NeuronInformation) -> bool {
    info.cached_neuron_stake_e8s == 0
        && info.maturity_e8s_equivalent == 0
        && info.staked_maturity_e8s_equivalent.unwrap_or_default() == 0
}

/// Returns (identity_account_number, wrap_holding_state) if currently in FetchNnsAssetsState with the given sub_state pattern.
macro_rules! nns_assets_state_matches {
    ($model:expr, $sub_pattern:pat $(if $guard:expr)? $(,)?) => {
        match & $model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::FetchAssets {
                        fetch_assets_state:
                            FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                                sub_state:
                                    FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                                        identity_account_number,
                                        sub_state: $sub_pattern $(if $guard)?,
                                    },
                            },
                        wrap_holding_state,
                    },
            } => (identity_account_number.clone(), wrap_holding_state.clone()),
            _ => {
                return Err(UpdateHolderError::WrongState);
            }
        }
    };
}

fn set_fetch_assets_state(
    model: &mut HolderModel,
    time: TimestampMillis,
    wrap_holding_state: Box<HoldingState>,
    new_fetch_state: FetchAssetsState,
) {
    model.state = Timestamped::new(
        time,
        HolderState::Holding {
            sub_state: HoldingState::FetchAssets {
                fetch_assets_state: new_fetch_state,
                wrap_holding_state,
            },
        },
    );
}

fn set_identity_accounts_sub_state(
    model: &mut HolderModel,
    time: TimestampMillis,
    wrap_holding_state: Box<HoldingState>,
    new_sub_state: FetchIdentityAccountsNnsAssetsState,
) {
    set_fetch_assets_state(
        model,
        time,
        wrap_holding_state,
        FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
            sub_state: new_sub_state,
        },
    );
}

fn set_nns_assets_sub_state(
    model: &mut HolderModel,
    time: TimestampMillis,
    wrap_holding_state: Box<HoldingState>,
    identity_account_number: Option<u64>,
    new_nns_sub_state: FetchNnsAssetsState,
) {
    set_identity_accounts_sub_state(
        model,
        time,
        wrap_holding_state,
        FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
            identity_account_number,
            sub_state: new_nns_sub_state,
        },
    );
}

/// Find the next account_number from fetching_assets.nns_assets that has not been fetched yet
/// (i.e., assets == None), skipping the one that was just finished.
fn find_next_unfetched_account(model: &HolderModel) -> Option<Option<u64>> {
    model
        .fetching_assets
        .as_ref()?
        .nns_assets
        .as_ref()?
        .iter()
        .find(|slot| slot.assets.is_none())
        .map(|slot| slot.identity_account_number)
}

/// Save fetching_nns_assets to the slot corresponding to identity_account_number.
/// Sets principal from delegation_data and clears fetching_nns_assets + delegation_data.
fn save_current_nns_assets_to_slot(
    model: &mut HolderModel,
    time: TimestampMillis,
    identity_account_number: Option<u64>,
) {
    let principal = model.get_delegation_controller();
    let mut nns_assets = model.fetching_nns_assets.take();
    model.delegation_data = None;

    // Ensure timestamps are set on nns_assets fields
    if let Some(a) = nns_assets.as_mut() {
        if let Some(neurons) = a.controlled_neurons.as_mut() {
            if neurons.timestamp == 0 {
                neurons.timestamp = time;
            }
        }
        if let Some(accounts) = a.accounts.as_mut() {
            if accounts.timestamp == 0 {
                accounts.timestamp = time;
            }
        }
    }

    if let Some(fetching) = model.fetching_assets.as_mut() {
        if let Some(slots) = fetching.nns_assets.as_mut() {
            if let Some(slot) = slots
                .iter_mut()
                .find(|s| s.identity_account_number == identity_account_number)
            {
                slot.principal = principal;
                slot.assets = nns_assets;
            }
        }
    }
}

pub(crate) fn handle_fetch_assets_event(
    model: &mut HolderModel,
    time: TimestampMillis,
    event: &FetchAssetsEvent,
) -> Result<(), UpdateHolderError> {
    match event {
        FetchAssetsEvent::FetchAssetsStarted { fetch_assets_state } => {
            let wrap_holding_state =
                assets_state_matches!(model, FetchAssetsState::StartFetchAssets);

            model.fetching_assets = Some(HolderAssets { nns_assets: None });
            model.fetching_nns_assets = None;

            set_fetch_assets_state(model, time, wrap_holding_state, fetch_assets_state.clone());

            Ok(())
        }

        FetchAssetsEvent::ObtainDelegation { event } => handle_delegation_event(model, time, event),

        FetchAssetsEvent::IdentityAccountsGot { hostname, accounts } => {
            let wrap_holding_state = assets_state_matches!(
                model,
                FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                    sub_state: FetchIdentityAccountsNnsAssetsState::GetIdentityAccounts,
                }
            );

            // Initialize slots for each identity account
            let slots: Vec<IdentityAccountNnsAssets> = accounts
                .iter()
                .map(|(account_number, account_name)| IdentityAccountNnsAssets {
                    identity_account_number: *account_number,
                    account_name: account_name.clone(),
                    principal: None,
                    assets: None,
                })
                .collect();

            model.fetching_assets.as_mut().unwrap().nns_assets = Some(slots);
            model.fetching_nns_assets = None;

            // Transition to first account or finish if no accounts
            if let Some(first_account_number) = accounts.first().map(|(n, _)| *n) {
                set_identity_accounts_sub_state(
                    model,
                    time,
                    wrap_holding_state,
                    FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                        identity_account_number: first_account_number,
                        sub_state: FetchNnsAssetsState::ObtainDelegationState {
                            sub_state: contract_canister_api::types::holder::DelegationState::NeedPrepareDelegation {
                                hostname: hostname.clone(),
                                identity_account_number: first_account_number,
                            },
                            wrap_fetch_state: Box::new(FetchNnsAssetsState::GetNeuronsIds),
                        },
                    },
                );
            } else {
                // No accounts — skip to global finish
                set_fetch_assets_state(
                    model,
                    time,
                    wrap_holding_state,
                    FetchAssetsState::FinishFetchAssets,
                );
            }

            Ok(())
        }

        FetchAssetsEvent::NeuronsIdsGot { neuron_ids } => {
            let (identity_account_number, wrap_holding_state) =
                nns_assets_state_matches!(model, FetchNnsAssetsState::GetNeuronsIds);

            model.fetching_nns_assets.get_or_insert(NnsHolderAssets {
                controlled_neurons: None,
                accounts: None,
            });

            model
                .fetching_nns_assets
                .as_mut()
                .unwrap()
                .controlled_neurons = Some(Timestamped::new(
                time,
                neuron_ids
                    .iter()
                    .map(|id| NeuronAsset {
                        neuron_id: *id,
                        info: None,
                    })
                    .collect(),
            ));

            let new_nns_state = if neuron_ids.is_empty() {
                FetchNnsAssetsState::GetAccountsInformation
            } else {
                FetchNnsAssetsState::GetNeuronsInformation {
                    neuron_hotkeys: vec![],
                }
            };

            set_nns_assets_sub_state(
                model,
                time,
                wrap_holding_state,
                identity_account_number,
                new_nns_state,
            );

            Ok(())
        }

        FetchAssetsEvent::NeuronsInformationGot {
            ctrl_neurons,
            hk_neurons,
        } => {
            let neuron_hotkeys = match &mut model.state.value {
                HolderState::Holding {
                    sub_state:
                        HoldingState::FetchAssets {
                            fetch_assets_state:
                                FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                                    sub_state:
                                        FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                                            sub_state:
                                                FetchNnsAssetsState::GetNeuronsInformation {
                                                    neuron_hotkeys,
                                                },
                                            ..
                                        },
                                },
                            ..
                        },
                } => neuron_hotkeys,
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            };

            let fetching_nns_assets = model.fetching_nns_assets.as_mut().unwrap();

            let mut new_neurons_info_map = BTreeMap::new();
            let mut empty_neuron_set = HashSet::new();
            ctrl_neurons.iter().for_each(|asset| {
                if let Some(info) = &asset.0.info {
                    if !neuron_is_empty(&info.value) {
                        new_neurons_info_map.insert(asset.0.neuron_id, &asset.0.info);
                        if !asset.1.is_empty() {
                            neuron_hotkeys.push((asset.0.neuron_id, asset.1.clone()));
                        }
                    } else {
                        empty_neuron_set.insert(asset.0.neuron_id);
                    }
                }
            });

            fetching_nns_assets
                .controlled_neurons
                .as_mut()
                .unwrap()
                .value
                .retain(|info| {
                    !hk_neurons.iter().any(|n| n.neuron_id == info.neuron_id)
                        && !empty_neuron_set.contains(&info.neuron_id)
                });

            fetching_nns_assets
                .controlled_neurons
                .as_mut()
                .unwrap()
                .value
                .iter_mut()
                .for_each(
                    |asset| match new_neurons_info_map.remove(&asset.neuron_id) {
                        None => {}
                        Some(loaded_info) => {
                            asset.info.clone_from(loaded_info);
                        }
                    },
                );

            Ok(())
        }

        FetchAssetsEvent::NeuronsInformationGotEmpty { neuron_ids } => {
            nns_assets_state_matches!(model, FetchNnsAssetsState::GetNeuronsInformation { .. });

            let fetching_nns_assets = model.fetching_nns_assets.as_mut().unwrap();
            let controlled_neurons = &mut fetching_nns_assets
                .controlled_neurons
                .as_mut()
                .unwrap()
                .value;
            controlled_neurons.retain(|neuron| !neuron_ids.contains(&neuron.neuron_id));

            Ok(())
        }

        FetchAssetsEvent::NeuronsInformationObtained => {
            let (identity_account_number, wrap_holding_state) = match &mut model.state.value {
                HolderState::Holding {
                    sub_state:
                        HoldingState::FetchAssets {
                            fetch_assets_state:
                                FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                                    sub_state:
                                        FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                                            identity_account_number,
                                            sub_state:
                                                FetchNnsAssetsState::GetNeuronsInformation { .. },
                                        },
                                },
                            wrap_holding_state,
                        },
                } => (
                    *identity_account_number,
                    wrap_holding_state.clone(),
                    // also capture neuron_hotkeys for DeletingNeuronsHotkeys
                    // need to restructure — read neuron_hotkeys here
                ),
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            };

            let neuron_hotkeys = match &model.state.value {
                HolderState::Holding {
                    sub_state:
                        HoldingState::FetchAssets {
                            fetch_assets_state:
                                FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                                    sub_state:
                                        FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                                            sub_state:
                                                FetchNnsAssetsState::GetNeuronsInformation {
                                                    neuron_hotkeys,
                                                },
                                            ..
                                        },
                                },
                            ..
                        },
                } => neuron_hotkeys.clone(),
                _ => return Err(UpdateHolderError::WrongState),
            };

            set_nns_assets_sub_state(
                model,
                time,
                wrap_holding_state,
                identity_account_number,
                FetchNnsAssetsState::DeletingNeuronsHotkeys { neuron_hotkeys },
            );

            Ok(())
        }

        FetchAssetsEvent::NeuronHotkeyDeleted {
            neuron_id, hot_key, ..
        } => {
            let neuron_hotkeys = match &mut model.state.value {
                HolderState::Holding {
                    sub_state:
                        HoldingState::FetchAssets {
                            fetch_assets_state:
                                FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                                    sub_state:
                                        FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                                            sub_state:
                                                FetchNnsAssetsState::DeletingNeuronsHotkeys {
                                                    neuron_hotkeys,
                                                },
                                            ..
                                        },
                                },
                            ..
                        },
                } => neuron_hotkeys,
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            };

            neuron_hotkeys.retain_mut(|entry| {
                if &entry.0 == neuron_id {
                    entry.1.retain(|hk| hk != hot_key);
                }
                !entry.1.is_empty()
            });
            Ok(())
        }

        FetchAssetsEvent::AllNeuronsHotkeysDeleted => {
            let (identity_account_number, wrap_holding_state) = nns_assets_state_matches!(
                model,
                FetchNnsAssetsState::DeletingNeuronsHotkeys { .. }
            );

            set_nns_assets_sub_state(
                model,
                time,
                wrap_holding_state,
                identity_account_number,
                FetchNnsAssetsState::GetAccountsInformation,
            );

            Ok(())
        }

        FetchAssetsEvent::AccountsInformationGot {
            accounts_information,
        } => {
            let (identity_account_number, wrap_holding_state) =
                nns_assets_state_matches!(model, FetchNnsAssetsState::GetAccountsInformation);

            model.fetching_nns_assets.as_mut().unwrap().accounts =
                Some(Timestamped::new(time, accounts_information.clone()));

            set_nns_assets_sub_state(
                model,
                time,
                wrap_holding_state,
                identity_account_number,
                FetchNnsAssetsState::GetAccountsBalances,
            );

            Ok(())
        }

        FetchAssetsEvent::AccountBalanceObtained {
            account_identifier,
            balance,
        } => {
            nns_assets_state_matches!(model, FetchNnsAssetsState::GetAccountsBalances);

            if let Some(accounts) = model
                .fetching_nns_assets
                .as_mut()
                .unwrap()
                .accounts
                .as_mut()
                .unwrap()
                .value
                .as_mut()
            {
                if let Some(main_account) = &mut accounts.main_account_information {
                    if &main_account.account_identifier == account_identifier {
                        main_account.balance = Some(Timestamped::new(time, *balance));
                    }
                }

                for sub_account in accounts.sub_accounts.iter_mut() {
                    if &sub_account.sub_account_information.account_identifier == account_identifier
                    {
                        sub_account.sub_account_information.balance =
                            Some(Timestamped::new(time, *balance));
                        break;
                    }
                }
            }

            Ok(())
        }

        FetchAssetsEvent::AccountsBalancesObtained => {
            let (identity_account_number, wrap_holding_state) =
                nns_assets_state_matches!(model, FetchNnsAssetsState::GetAccountsBalances);

            // Move to per-account finish state
            set_identity_accounts_sub_state(
                model,
                time,
                wrap_holding_state,
                FetchIdentityAccountsNnsAssetsState::FinishCurrentNnsAccountFetch {
                    identity_account_number,
                },
            );

            Ok(())
        }

        FetchAssetsEvent::NnsAssetsForAccountFetched {
            identity_account_number,
        } => {
            let wrap_holding_state = assets_state_matches!(
                model,
                FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                    sub_state: FetchIdentityAccountsNnsAssetsState::FinishCurrentNnsAccountFetch { .. },
                }
            );

            // Read hostname from delegation_data before clearing it
            let hostname = model
                .delegation_data
                .as_ref()
                .map(|d| d.hostname.clone())
                .unwrap_or_default();

            // Save current account's nns assets to the appropriate slot (also clears delegation_data)
            save_current_nns_assets_to_slot(model, time, *identity_account_number);

            // Find next unfetched account
            match find_next_unfetched_account(model) {
                Some(next_account_number) => {
                    // Transition to ObtainDelegationState for the next account
                    set_identity_accounts_sub_state(
                        model,
                        time,
                        wrap_holding_state,
                        FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                            identity_account_number: next_account_number,
                            sub_state: FetchNnsAssetsState::ObtainDelegationState {
                                sub_state:
                                    contract_canister_api::types::holder::DelegationState::NeedPrepareDelegation {
                                        hostname,
                                        identity_account_number: next_account_number,
                                    },
                                wrap_fetch_state: Box::new(FetchNnsAssetsState::GetNeuronsIds),
                            },
                        },
                    );
                }
                None => {
                    // All accounts fetched — transition to global FinishFetchAssets
                    set_fetch_assets_state(
                        model,
                        time,
                        wrap_holding_state,
                        FetchAssetsState::FinishFetchAssets,
                    );
                }
            }

            Ok(())
        }

        FetchAssetsEvent::FetchAssetsFinished => {
            let wrap_holding_state =
                assets_state_matches!(model, FetchAssetsState::FinishFetchAssets);

            if matches!(*wrap_holding_state, HoldingState::Hold { .. }) {
                let fetching_assets = model.fetching_assets.take().unwrap();
                model.assets = Some(Timestamped::new(time, fetching_assets));
            }

            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: *wrap_holding_state.clone(),
                },
            );
            Ok(())
        }

        FetchAssetsEvent::TooManyAccounts => {
            let wrap_holding_state = assets_state_matches!(
                model,
                FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                    sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                        sub_state: FetchNnsAssetsState::GetAccountsInformation,
                        ..
                    },
                }
            );

            transfer_to_unsellable_state(
                model,
                time,
                wrap_holding_state.get_sale_deal_state(),
                LimitFailureReason::TooManyAccounts,
            );

            Ok(())
        }

        FetchAssetsEvent::TooManyNeurons => {
            let wrap_holding_state = assets_state_matches!(
                model,
                FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                    sub_state: FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                        sub_state: FetchNnsAssetsState::GetNeuronsInformation { .. },
                        ..
                    },
                }
            );

            transfer_to_unsellable_state(
                model,
                time,
                wrap_holding_state.get_sale_deal_state(),
                LimitFailureReason::TooManyNeurons,
            );

            Ok(())
        }
    }
}

fn transfer_to_unsellable_state(
    model: &mut HolderModel,
    time: u64,
    sale_deal_state: Option<&contract_canister_api::types::holder::SaleDealState>,
    reason: LimitFailureReason,
) {
    let target_state = HoldingState::Unsellable {
        reason: UnsellableReason::CheckLimitFailed { reason },
    };

    match sale_deal_state {
        None => {
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: target_state,
                },
            )
        }
        Some(sale_state) => {
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::CancelSaleDeal {
                        sub_state: CancelSaleDealState::StartCancelSaleDeal {
                            sale_deal_state: sale_state.clone().into(),
                        },
                        wrap_holding_state: target_state.into(),
                    },
                },
            );
        }
    }
}
