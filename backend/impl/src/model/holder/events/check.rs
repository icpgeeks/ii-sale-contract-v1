use common_canister_types::{TimestampMillis, Timestamped};
use contract_canister_api::types::holder::{
    CancelSaleDealState, CheckAssetsEvent, CheckAssetsState, HolderState, HoldingState,
    UnsellableReason,
};

use crate::model::holder::{HolderModel, UpdateHolderError};

#[macro_export]
macro_rules! check_state_matches {
    ($expression:expr, $pattern:pat $(if $guard:expr)? $(,)?) => {
        match & $expression.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::CheckAssets {
                        sub_state: $pattern $(if $guard)?,
                        wrap_holding_state,
                    },
            }
             => { wrap_holding_state.clone() },
            _ => { return Err(UpdateHolderError::WrongState); }
        }
    };
}

fn set_check_sub_state(
    model: &mut HolderModel,
    time: TimestampMillis,
    wrap_holding_state: Box<HoldingState>,
    new_state: CheckAssetsState,
) {
    model.state = Timestamped::new(
        time,
        HolderState::Holding {
            sub_state: HoldingState::CheckAssets {
                sub_state: new_state,
                wrap_holding_state,
            },
        },
    );
}

pub(crate) fn handle_check_assets_event(
    model: &mut HolderModel,
    time: TimestampMillis,
    event: &CheckAssetsEvent,
) -> Result<(), UpdateHolderError> {
    match event {
        CheckAssetsEvent::CheckAssetsStarted => {
            let wrap_holding_state =
                check_state_matches!(model, CheckAssetsState::StartCheckAssets);

            set_check_sub_state(
                model,
                time,
                wrap_holding_state,
                CheckAssetsState::CheckAccountsForNoApprovePrepare,
            );
            Ok(())
        }
        CheckAssetsEvent::CheckAccountsPrepared { sub_accounts } => {
            let wrap_holding_state =
                check_state_matches!(model, CheckAssetsState::CheckAccountsForNoApprovePrepare);

            set_check_sub_state(
                model,
                time,
                wrap_holding_state,
                CheckAssetsState::CheckAccountsForNoApproveSequential {
                    sub_accounts: sub_accounts.clone(),
                },
            );
            Ok(())
        }
        CheckAssetsEvent::CheckAccountsAdvance { sub_account } => match &model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::CheckAssets {
                        sub_state:
                            CheckAssetsState::CheckAccountsForNoApproveSequential { sub_accounts },
                        wrap_holding_state,
                    },
            } => {
                let mut new_sub_accounts = sub_accounts.clone();
                new_sub_accounts.retain(|(_, sa)| sa != sub_account);

                if new_sub_accounts.is_empty() {
                    set_check_sub_state(
                        model,
                        time,
                        wrap_holding_state.clone(),
                        CheckAssetsState::FinishCheckAssets,
                    );
                } else {
                    set_check_sub_state(
                        model,
                        time,
                        wrap_holding_state.clone(),
                        CheckAssetsState::CheckAccountsForNoApproveSequential {
                            sub_accounts: new_sub_accounts,
                        },
                    );
                }
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        CheckAssetsEvent::AccountHasApprove { sub_account } => {
            let wrap_holding_state = check_state_matches!(
                model,
                CheckAssetsState::CheckAccountsForNoApproveSequential { .. }
            );
            let unsellable_sub_state = HoldingState::Unsellable {
                reason: UnsellableReason::ApproveOnAccount {
                    sub_account: sub_account.clone(),
                },
            };

            match wrap_holding_state.get_sale_deal_state() {
                None => {
                    model.state = Timestamped::new(
                        time,
                        HolderState::Holding {
                            sub_state: unsellable_sub_state,
                        },
                    );
                    Ok(())
                }
                Some(sale_deal_state) => {
                    model.state = Timestamped::new(
                        time,
                        HolderState::Holding {
                            sub_state: HoldingState::CancelSaleDeal {
                                sub_state: CancelSaleDealState::StartCancelSaleDeal {
                                    sale_deal_state: Box::new(sale_deal_state.clone()),
                                },
                                wrap_holding_state: Box::new(unsellable_sub_state),
                            },
                        },
                    );
                    Ok(())
                }
            }
        }
        CheckAssetsEvent::CheckAssetsFinished => {
            let wrap_holding_state =
                check_state_matches!(model, CheckAssetsState::FinishCheckAssets);

            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: *wrap_holding_state,
                },
            );
            Ok(())
        }
    }
}
