use contract_canister_api::types::holder::{
    CancelSaleDealState, CheckAssetsState, DelegationState, FetchAssetsState,
    FetchIdentityAccountsNnsAssetsState, FetchNnsAssetsState, SaleDealAcceptSubState,
    SaleDealState,
};

use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HolderState, HoldingProcessingEvent,
    HoldingState, SaleDealProcessingEvent,
};

use crate::components::Environment;
use crate::handlers::holder::processor::{ProcessingResult, Processor};
use crate::handlers::holder::states::{
    cancel_sale_deal, check_accounts_for_no_approve_prepare,
    check_accounts_for_no_approve_sequential, check_quarantine_completed, delete_neurons_hotkeys,
    finish_check_assets, finish_fetch_assets, get_accounts_balances, get_accounts_information,
    get_holder_model, get_identity_accounts, get_neurons_ids, get_neurons_information,
    prepare_delegation, refund_buyer_from_transit_account, resolve_referral_reward_data,
    sleep_processing, start_accept_sale_deal, start_check_assets, start_fetch_assets,
    start_holding, transfer_developer_reward, transfer_hub_reward, transfer_referral_reward,
    transfer_sale_deal_amount_to_seller_account, transfer_sale_deal_amount_to_transit_account,
    update_holder, validate_assets,
};
use crate::model::holder::HolderLock;
use crate::{log_info, processor_toolkit, read_state};

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let holding_state = get_holder_model(|_, model| match &model.state.value {
        HolderState::Holding { sub_state } => sub_state.clone(),
        _ => panic!(),
    });

    match holding_state {
        HoldingState::Unsellable { .. } => {
            return sleep_processing::process(env, lock).await;
        }
        HoldingState::CancelSaleDeal { sub_state, .. } => match sub_state {
            CancelSaleDealState::StartCancelSaleDeal { .. } => {
                return cancel_sale_deal::process(env, lock).await;
            }
            CancelSaleDealState::RefundBuyerFromTransitAccount { .. } => {
                return refund_buyer_from_transit_account::process(env, lock).await;
            }
        },
        _ => {}
    }

    let check_result = match holding_state.get_sale_deal_state() {
        Some(sale_deal_state) => match sale_deal_state {
            SaleDealState::WaitingSellOffer | SaleDealState::Trading => {
                check_sale_intention_expiry(env, lock)
            }
            SaleDealState::Accept { .. } => check_certificate_expiry(env, lock),
        },
        None => check_sellable_expiry(env, lock),
    };

    let check_scheduled_time = match check_result {
        Ok(ProcessingResult::Schedule { scheduled_time }) => scheduled_time,
        result => {
            return result;
        }
    };

    let scheduled_time = if let Some(processor) = get_holding_processor(holding_state) {
        match processor(env, lock).await {
            Ok(ProcessingResult::Schedule { scheduled_time }) => scheduled_time,
            result => {
                return result;
            }
        }
    } else {
        check_scheduled_time
    };

    Ok(ProcessingResult::Schedule { scheduled_time })
}

fn check_sellable_expiry(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let now = env.get_time().get_current_unix_epoch_time_millis();

    let certificate_expiration = read_state(|state| {
        state
            .get_model()
            .get_init_contract_args()
            .certificate
            .contract_certificate
            .expiration
    });

    let sellable_expiration =
        certificate_expiration - env.get_settings().sale_deal_safe_close_duration;

    if sellable_expiration <= now {
        log_info!(env, "Sellable: expired.");

        update_holder(
            lock,
            HolderProcessingEvent::Holding {
                event: HoldingProcessingEvent::SellableExpired,
            },
        )?;
        return Ok(ProcessingResult::Continue);
    }

    Ok(ProcessingResult::Schedule {
        scheduled_time: sellable_expiration,
    })
}

fn check_sale_intention_expiry(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let now = env.get_time().get_current_unix_epoch_time_millis();

    // check sale deal expiration
    let sale_deal_expiration_time =
        get_holder_model(|_, model| model.sale_deal.as_ref().unwrap().expiration_time);

    if sale_deal_expiration_time <= now {
        update_holder(
            lock,
            HolderProcessingEvent::Holding {
                event: HoldingProcessingEvent::SaleDeal {
                    event: Box::new(SaleDealProcessingEvent::SaleIntentionExpired),
                },
            },
        )?;

        log_info!(env, "Sale intention: expired!");

        Ok(ProcessingResult::Continue)
    } else {
        Ok(ProcessingResult::Schedule {
            scheduled_time: sale_deal_expiration_time,
        })
    }
}

fn check_certificate_expiry(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let now = env.get_time().get_current_unix_epoch_time_millis();

    let certificate_expiration = read_state(|state| {
        state
            .get_model()
            .get_init_contract_args()
            .certificate
            .contract_certificate
            .expiration
    });

    if certificate_expiration <= now {
        update_holder(
            lock,
            HolderProcessingEvent::Holding {
                event: HoldingProcessingEvent::SaleDeal {
                    event: Box::new(SaleDealProcessingEvent::CertificateExpired),
                },
            },
        )?;

        log_info!(env, "Accepted sale deal: certificate expired!");

        Ok(ProcessingResult::Continue)
    } else {
        Ok(ProcessingResult::Schedule {
            scheduled_time: certificate_expiration,
        })
    }
}

fn get_holding_processor<'a>(holding_state: HoldingState) -> Option<Processor<'a>> {
    match holding_state {
        HoldingState::StartHolding => Some(processor_toolkit!(start_holding)),
        HoldingState::FetchAssets {
            fetch_assets_state, ..
        } => match fetch_assets_state {
            FetchAssetsState::StartFetchAssets => Some(processor_toolkit!(start_fetch_assets)),
            FetchAssetsState::FetchIdentityAccountsNnsAssetsState { sub_state } => {
                match sub_state {
                    FetchIdentityAccountsNnsAssetsState::GetIdentityAccounts => {
                        Some(processor_toolkit!(get_identity_accounts))
                    }
                    FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                        sub_state, ..
                    } => match sub_state {
                        FetchNnsAssetsState::ObtainDelegationState { sub_state, .. } => {
                            match sub_state {
                                DelegationState::NeedPrepareDelegation { .. } => {
                                    Some(processor_toolkit!(prepare_delegation))
                                }
                                DelegationState::GetDelegationWaiting { .. } => None,
                            }
                        }
                        FetchNnsAssetsState::GetNeuronsIds => {
                            Some(processor_toolkit!(get_neurons_ids))
                        }
                        FetchNnsAssetsState::GetNeuronsInformation { .. } => {
                            Some(processor_toolkit!(get_neurons_information))
                        }
                        FetchNnsAssetsState::DeletingNeuronsHotkeys { .. } => {
                            Some(processor_toolkit!(delete_neurons_hotkeys))
                        }
                        FetchNnsAssetsState::GetAccountsInformation => {
                            Some(processor_toolkit!(get_accounts_information))
                        }
                        FetchNnsAssetsState::GetAccountsBalances => {
                            Some(processor_toolkit!(get_accounts_balances))
                        }
                    },
                    FetchIdentityAccountsNnsAssetsState::FinishCurrentNnsAccountFetch {
                        ..
                    } => Some(processor_toolkit!(finish_fetch_assets)),
                }
            }
            FetchAssetsState::FinishFetchAssets => Some(processor_toolkit!(finish_fetch_assets)),
        },
        HoldingState::Hold {
            quarantine,
            sale_deal_state: sale_process_state,
        } => match sale_process_state {
            Some(sale_process_state) => match sale_process_state {
                SaleDealState::WaitingSellOffer | SaleDealState::Trading => {
                    if quarantine.is_some() {
                        Some(processor_toolkit!(check_quarantine_completed))
                    } else {
                        None
                    }
                }
                SaleDealState::Accept { sub_state, .. } => Some(match sub_state {
                    SaleDealAcceptSubState::StartAccept => {
                        processor_toolkit!(start_accept_sale_deal)
                    }
                    SaleDealAcceptSubState::TransferSaleDealAmountToTransitAccount => {
                        processor_toolkit!(transfer_sale_deal_amount_to_transit_account)
                    }
                    SaleDealAcceptSubState::ResolveReferralRewardData => {
                        processor_toolkit!(resolve_referral_reward_data)
                    }
                    SaleDealAcceptSubState::TransferReferralReward { .. } => {
                        processor_toolkit!(transfer_referral_reward)
                    }
                    SaleDealAcceptSubState::TransferDeveloperReward => {
                        processor_toolkit!(transfer_developer_reward)
                    }
                    SaleDealAcceptSubState::TransferHubReward => {
                        processor_toolkit!(transfer_hub_reward)
                    }
                    SaleDealAcceptSubState::TransferSaleDealAmountToSellerAccount => {
                        processor_toolkit!(transfer_sale_deal_amount_to_seller_account)
                    }
                }),
            },
            None => {
                if quarantine.is_some() {
                    Some(processor_toolkit!(check_quarantine_completed))
                } else {
                    None
                }
            }
        },
        HoldingState::ValidateAssets { .. } => Some(processor_toolkit!(validate_assets)),
        HoldingState::Unsellable { .. } => None,
        HoldingState::CheckAssets { sub_state, .. } => Some(match sub_state {
            CheckAssetsState::StartCheckAssets => processor_toolkit!(start_check_assets),
            CheckAssetsState::CheckAccountsForNoApprovePrepare => {
                processor_toolkit!(check_accounts_for_no_approve_prepare)
            }
            CheckAssetsState::CheckAccountsForNoApproveSequential { .. } => {
                processor_toolkit!(check_accounts_for_no_approve_sequential)
            }
            CheckAssetsState::FinishCheckAssets => processor_toolkit!(finish_check_assets),
        }),
        HoldingState::CancelSaleDeal { .. } => panic!(),
    }
}
