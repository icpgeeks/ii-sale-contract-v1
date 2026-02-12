use common_canister_types::{TimestampMillis, Timestamped};
use contract_canister_api::types::holder::{
    CancelSaleDealState, CheckAssetsState, FetchAssetsState, HolderState,
    HoldingProcessingEvent::{self, *},
    HoldingState, ReleaseInitiation, ReleaseState, SaleDealState, UnsellableReason,
};

use crate::{
    model::holder::{HolderModel, UpdateHolderError},
    state_matches,
};

use super::{
    assets::handle_fetch_assets_event, check::handle_check_assets_event, sale::handle_sale_event,
};

pub(crate) fn handle_holding_event(
    model: &mut HolderModel,
    time: TimestampMillis,
    event: &HoldingProcessingEvent,
) -> Result<(), UpdateHolderError> {
    match event {
        FetchAssets { event } => handle_fetch_assets_event(model, time, event),
        CheckAssets { event } => handle_check_assets_event(model, time, event),
        HoldingStarted {
            quarantine_completion_time,
        } => handle_holding_started(model, time, quarantine_completion_time),
        HoldingStartExpired => handle_holding_start_expired(model, time),
        QuarantineCompleted => handle_quarantine_completed(model, time),
        AssetsValidated => handle_assets_validated(model, time),
        ValidateAssetsFailed { reason } => handle_validate_access_failed(model, time, reason),
        SaleDeal { event } => handle_sale_event(model, time, event),
        StartRelease => handle_start_manual_release(model, time),
        SellableExpired => handle_sellable_expired(model, time),
    }
}

fn handle_holding_started(
    model: &mut HolderModel,
    time: TimestampMillis,
    quarantine_completion_time: &TimestampMillis,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::StartHolding
        }
    );

    let fetching_assets = model.fetching_assets.take().unwrap();
    model.assets = Some(Timestamped::new(time, fetching_assets));

    model.state = Timestamped::new(
        time,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                quarantine: Some(*quarantine_completion_time),
                sale_deal_state: None,
            },
        },
    );
    Ok(())
}

fn handle_holding_start_expired(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::StartHolding
        }
    );

    let fetching_assets = model.fetching_assets.take().unwrap();
    model.assets = Some(Timestamped::new(time, fetching_assets));

    model.state = Timestamped::new(
        time,
        HolderState::Holding {
            sub_state: HoldingState::Unsellable {
                reason: UnsellableReason::CertificateExpired,
            },
        },
    );
    Ok(())
}

fn handle_quarantine_completed(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::Hold {
                    quarantine: Some(_),
                    sale_deal_state: sale_process_state,
                },
        } => {
            let new_holding_state = HoldingState::Hold {
                quarantine: None,
                sale_deal_state: sale_process_state.clone(),
            };
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::FetchAssets {
                        fetch_assets_state: FetchAssetsState::StartFetchAssets,
                        wrap_holding_state: Box::new(HoldingState::CheckAssets {
                            sub_state: CheckAssetsState::StartCheckAssets,
                            wrap_holding_state: Box::new(HoldingState::ValidateAssets {
                                wrap_holding_state: Box::new(new_holding_state),
                            }),
                        }),
                    },
                },
            );
            Ok(())
        }
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn handle_assets_validated(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding {
            sub_state: HoldingState::ValidateAssets { wrap_holding_state },
        } => {
            let new_assets = model.fetching_assets.take().unwrap();
            model.assets = Some(Timestamped::new(time, new_assets));
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: *wrap_holding_state.to_owned(),
                },
            );

            Ok(())
        }
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn handle_validate_access_failed(
    model: &mut HolderModel,
    time: TimestampMillis,
    reason: &str,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding {
            sub_state: HoldingState::ValidateAssets { wrap_holding_state },
        } => match wrap_holding_state.as_ref() {
            HoldingState::Hold {
                sale_deal_state, ..
            } => {
                let unsellable_state = HoldingState::Unsellable {
                    reason: UnsellableReason::ValidationFailed {
                        reason: reason.to_owned(),
                    },
                };

                match sale_deal_state {
                    Some(sale_deal_state) => {
                        model.state = Timestamped::new(
                            time,
                            HolderState::Holding {
                                sub_state: HoldingState::CancelSaleDeal {
                                    sub_state: CancelSaleDealState::StartCancelSaleDeal {
                                        sale_deal_state: Box::new(sale_deal_state.clone()),
                                    },
                                    wrap_holding_state: Box::new(unsellable_state),
                                },
                            },
                        );
                        Ok(())
                    }
                    None => {
                        model.state = Timestamped::new(
                            time,
                            HolderState::Holding {
                                sub_state: unsellable_state,
                            },
                        );
                        Ok(())
                    }
                }
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn handle_start_manual_release(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    if let Some(unsellable_reason) = can_release_holder(&model.state.value) {
        model.sale_deal = None;
        model.state = Timestamped::new(
            time,
            HolderState::Release {
                release_initiation: ReleaseInitiation::Manual { unsellable_reason },
                sub_state: ReleaseState::StartRelease,
            },
        );
        Ok(())
    } else {
        Err(UpdateHolderError::WrongState)
    }
}

fn handle_sellable_expired(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding { sub_state, .. } if sub_state.get_sale_deal_state().is_none() => {
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::Unsellable {
                        reason: UnsellableReason::CertificateExpired,
                    },
                },
            );
            Ok(())
        }
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn can_release_holder(state: &HolderState) -> Option<Option<UnsellableReason>> {
    match state {
        HolderState::Holding { sub_state } => can_release_holding_state(sub_state),
        _ => None,
    }
}

fn can_release_holding_state(sub_state: &HoldingState) -> Option<Option<UnsellableReason>> {
    match sub_state {
        HoldingState::StartHolding => Some(None),
        HoldingState::FetchAssets {
            wrap_holding_state, ..
        } => can_release_holding_state(wrap_holding_state),
        HoldingState::Hold {
            sale_deal_state, ..
        } => {
            if sale_deal_state.is_none()
                | matches!(
                    sale_deal_state,
                    Some(SaleDealState::WaitingSellOffer | SaleDealState::Trading)
                )
            {
                Some(None)
            } else {
                None
            }
        }
        HoldingState::ValidateAssets { wrap_holding_state } => {
            can_release_holding_state(wrap_holding_state)
        }
        HoldingState::CheckAssets {
            wrap_holding_state, ..
        } => can_release_holding_state(wrap_holding_state),
        HoldingState::Unsellable { reason } => Some(Some(reason.clone())),
        HoldingState::CancelSaleDeal { .. } => None,
    }
}
