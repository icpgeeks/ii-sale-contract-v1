use common_canister_types::{TimestampMillis, Timestamped};
use contract_canister_api::types::holder::{
    DelegationState, FetchAssetsState, HolderState, HoldingState, ObtainDelegationEvent,
};

use crate::model::holder::{HolderModel, UpdateHolderError};

pub(crate) fn handle_delegation_event(
    model: &mut HolderModel,
    time: TimestampMillis,
    event: &ObtainDelegationEvent,
) -> Result<(), UpdateHolderError> {
    match event {
        ObtainDelegationEvent::RetryPrepareDelegation => match &mut model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::FetchAssets {
                        fetch_assets_state:
                            FetchAssetsState::ObtainDelegationState {
                                sub_state:
                                    DelegationState::GetDelegationWaiting {
                                        delegation_data, ..
                                    },
                                wrap_fetch_state,
                            },
                        wrap_holding_state,
                    },
            } => {
                model.state = Timestamped::new(
                    time,
                    HolderState::Holding {
                        sub_state: HoldingState::FetchAssets {
                            fetch_assets_state: FetchAssetsState::ObtainDelegationState {
                                sub_state: DelegationState::NeedPrepareDelegation {
                                    hostname: delegation_data.hostname.clone(),
                                },
                                wrap_fetch_state: wrap_fetch_state.clone(),
                            },
                            wrap_holding_state: wrap_holding_state.clone(),
                        },
                    },
                );
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        ObtainDelegationEvent::DelegationPrepared {
            get_delegation_request,
            delegation_data,
        } => match &mut model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::FetchAssets {
                        fetch_assets_state:
                            FetchAssetsState::ObtainDelegationState {
                                sub_state: DelegationState::NeedPrepareDelegation { .. },
                                wrap_fetch_state,
                            },
                        wrap_holding_state,
                    },
            } => {
                model.state = Timestamped::new(
                    time,
                    HolderState::Holding {
                        sub_state: HoldingState::FetchAssets {
                            fetch_assets_state: FetchAssetsState::ObtainDelegationState {
                                sub_state: DelegationState::GetDelegationWaiting {
                                    get_delegation_request: get_delegation_request.clone(),
                                    delegation_data: delegation_data.clone(),
                                },
                                wrap_fetch_state: wrap_fetch_state.clone(),
                            },
                            wrap_holding_state: wrap_holding_state.clone(),
                        },
                    },
                );
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        ObtainDelegationEvent::DelegationGot { delegation_data } => match &mut model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::FetchAssets {
                        fetch_assets_state:
                            FetchAssetsState::ObtainDelegationState {
                                sub_state: DelegationState::GetDelegationWaiting { .. },
                                wrap_fetch_state,
                            },
                        wrap_holding_state,
                    },
            } => {
                model.delegation_data = Some(delegation_data.clone());
                model.state = Timestamped::new(
                    time,
                    HolderState::Holding {
                        sub_state: HoldingState::FetchAssets {
                            fetch_assets_state: *wrap_fetch_state.clone(),
                            wrap_holding_state: wrap_holding_state.clone(),
                        },
                    },
                );
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        ObtainDelegationEvent::DelegationLost => match &mut model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::FetchAssets {
                        fetch_assets_state,
                        wrap_holding_state,
                    },
            } => {
                let hostname = model.delegation_data.as_ref().unwrap().hostname.clone();
                model.delegation_data = None;
                model.state = Timestamped::new(
                    time,
                    HolderState::Holding {
                        sub_state: HoldingState::FetchAssets {
                            fetch_assets_state: FetchAssetsState::ObtainDelegationState {
                                sub_state: DelegationState::NeedPrepareDelegation { hostname },
                                wrap_fetch_state: Box::new(fetch_assets_state.clone()),
                            },
                            wrap_holding_state: wrap_holding_state.clone(),
                        },
                    },
                );
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
    }
}
