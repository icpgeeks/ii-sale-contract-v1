use std::collections::{BTreeMap, HashSet};

use common_canister_types::{TimestampMillis, Timestamped};
use contract_canister_api::types::holder::{
    CancelSaleDealState, FetchAssetsEvent, FetchAssetsState, FetchNnsAssetsState, HolderState,
    HoldingState, LimitFailureReason, NeuronAsset, NeuronInformation, UnsellableReason,
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

pub(crate) fn handle_fetch_assets_event(
    model: &mut HolderModel,
    time: TimestampMillis,
    event: &FetchAssetsEvent,
) -> Result<(), UpdateHolderError> {
    match event {
        FetchAssetsEvent::FetchAssetsStarted { fetch_assets_state } => {
            let wrap_holding_state =
                assets_state_matches!(model, FetchAssetsState::StartFetchAssets);

            model.fetching_assets = Some(HolderAssets {
                controlled_neurons: None,
                accounts: None,
            });

            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::FetchAssets {
                        fetch_assets_state: fetch_assets_state.clone(),
                        wrap_holding_state,
                    },
                },
            );

            Ok(())
        }
        FetchAssetsEvent::ObtainDelegation { event } => handle_delegation_event(model, time, event),
        FetchAssetsEvent::NeuronsIdsGot { neuron_ids } => {
            let wrap_holding_state = assets_state_matches!(
                model,
                FetchAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetNeuronsIds,
                }
            );

            model.fetching_assets.as_mut().unwrap().controlled_neurons = Some(Timestamped::new(
                time,
                neuron_ids
                    .iter()
                    .map(|id| NeuronAsset {
                        neuron_id: *id,
                        info: None,
                    })
                    .collect(),
            ));

            let new_fetch_state = if neuron_ids.is_empty() {
                FetchAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetAccountsInformation,
                }
            } else {
                FetchAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetNeuronsInformation {
                        neuron_hotkeys: vec![],
                    },
                }
            };

            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::FetchAssets {
                        fetch_assets_state: new_fetch_state,
                        wrap_holding_state,
                    },
                },
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
                                FetchAssetsState::FetchNnsAssetsState {
                                    sub_state:
                                        FetchNnsAssetsState::GetNeuronsInformation { neuron_hotkeys },
                                },
                            ..
                        },
                } => neuron_hotkeys,
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            };

            let fetching_assets = model.fetching_assets.as_mut().unwrap();

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

            fetching_assets
                .controlled_neurons
                .as_mut()
                .unwrap()
                .value
                .retain(|info| {
                    !hk_neurons.iter().any(|n| n.neuron_id == info.neuron_id)
                        && !empty_neuron_set.contains(&info.neuron_id)
                });

            // update controlled neurons info

            fetching_assets
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
            assets_state_matches!(
                model,
                FetchAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetNeuronsInformation { .. },
                }
            );

            let fetching_assets = model.fetching_assets.as_mut().unwrap();
            let controlled_neurons =
                &mut fetching_assets.controlled_neurons.as_mut().unwrap().value;
            controlled_neurons.retain(|neuron| !neuron_ids.contains(&neuron.neuron_id));

            Ok(())
        }
        FetchAssetsEvent::NeuronsInformationObtained => {
            let (wrap_holding_state, neuron_hotkeys) = match &mut model.state.value {
                HolderState::Holding {
                    sub_state:
                        HoldingState::FetchAssets {
                            fetch_assets_state:
                                FetchAssetsState::FetchNnsAssetsState {
                                    sub_state:
                                        FetchNnsAssetsState::GetNeuronsInformation { neuron_hotkeys },
                                },
                            wrap_holding_state,
                        },
                } => (wrap_holding_state, neuron_hotkeys),
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            };

            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::FetchAssets {
                        fetch_assets_state: FetchAssetsState::FetchNnsAssetsState {
                            sub_state: FetchNnsAssetsState::DeletingNeuronsHotkeys {
                                neuron_hotkeys: neuron_hotkeys.clone(),
                            },
                        },
                        wrap_holding_state: wrap_holding_state.clone(),
                    },
                },
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
                                FetchAssetsState::FetchNnsAssetsState {
                                    sub_state:
                                        FetchNnsAssetsState::DeletingNeuronsHotkeys { neuron_hotkeys },
                                },
                            ..
                        },
                } => neuron_hotkeys,
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            };

            neuron_hotkeys.retain_mut(|neuron_hotkeys_entry| {
                if &neuron_hotkeys_entry.0 == neuron_id {
                    neuron_hotkeys_entry.1.retain(|hk| hk != hot_key);
                }
                !neuron_hotkeys_entry.1.is_empty()
            });
            Ok(())
        }
        FetchAssetsEvent::AllNeuronsHotkeysDeleted => {
            let wrap_holding_state = assets_state_matches!(
                model,
                FetchAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::DeletingNeuronsHotkeys { .. },
                }
            );

            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::FetchAssets {
                        fetch_assets_state: FetchAssetsState::FetchNnsAssetsState {
                            sub_state: FetchNnsAssetsState::GetAccountsInformation,
                        },
                        wrap_holding_state,
                    },
                },
            );

            Ok(())
        }
        FetchAssetsEvent::AccountsInformationGot {
            accounts_information,
        } => {
            let wrap_holding_state = assets_state_matches!(
                model,
                FetchAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetAccountsInformation,
                }
            );

            model.fetching_assets.as_mut().unwrap().accounts =
                Some(Timestamped::new(time, accounts_information.clone()));

            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::FetchAssets {
                        fetch_assets_state: FetchAssetsState::FetchNnsAssetsState {
                            sub_state: FetchNnsAssetsState::GetAccountsBalances,
                        },
                        wrap_holding_state: wrap_holding_state.clone(),
                    },
                },
            );
            Ok(())
        }
        FetchAssetsEvent::AccountBalanceObtained {
            account_identifier,
            balance,
        } => {
            assets_state_matches!(
                model,
                FetchAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetAccountsBalances,
                }
            );

            if let Some(accounts) = model
                .fetching_assets
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
            let wrap_holding_state = assets_state_matches!(
                model,
                FetchAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetAccountsBalances,
                }
            );

            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::FetchAssets {
                        fetch_assets_state: FetchAssetsState::FinishFetchAssets,
                        wrap_holding_state: wrap_holding_state.clone(),
                    },
                },
            );
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
                FetchAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetAccountsInformation
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
                FetchAssetsState::FetchNnsAssetsState {
                    sub_state: FetchNnsAssetsState::GetNeuronsInformation { .. }
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
