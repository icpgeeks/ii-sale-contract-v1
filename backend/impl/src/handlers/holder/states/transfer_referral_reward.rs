use common_canister_impl::components::ledger::to_account_identifier;
use common_canister_types::TransferInformation;
use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HolderState, HoldingProcessingEvent,
    HoldingState, ReferralRewardData, SaleDealAcceptSubState, SaleDealProcessingEvent,
    SaleDealState,
};
use ic_ledger_types::Memo;

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{
    get_holder_model, to_ic_agent_error, to_internal_error, update_holder,
};
use crate::handlers::rewards_calculator::RewardsCalculator;
use crate::handlers::wallet::get_sale_deal_transit_sub_account;
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Referral reward: transferring ...");

    let (seller, sell_price, referral_reward_account, referral_reward_memo) = get_holder_model(
        |state, model| {
            let reward_data = match &model.state.value {
                HolderState::Holding {
                    sub_state:
                        HoldingState::Hold {
                            sale_deal_state:
                                Some(SaleDealState::Accept {
                                    sub_state:
                                        SaleDealAcceptSubState::TransferReferralReward { reward_data },
                                    ..
                                }),
                            ..
                        },
                } => reward_data,
                _ => panic!(),
            };

            let (referral_reward_account, referral_reward_memo) = match reward_data {
                None => {
                    let account = state
                        .get_env()
                        .get_settings()
                        .referral_reward_fallback_account;

                    let contract_template_id = state
                        .get_model()
                        .get_init_contract_args()
                        .certificate
                        .contract_certificate
                        .contract_template_id;

                    log_info!(
                        env,
                        "Referral reward: using contract referral account {}, contract template ID {}.",
                        account.to_hex(),
                        contract_template_id
                    );

                    Ok((account, contract_template_id))
                }
                Some(ReferralRewardData { account, memo }) => {
                    to_account_identifier(account).map(|account| (account, *memo))
                }
            }
            .map_err(to_internal_error)?;

            Ok((
                model.owner.as_ref().unwrap().value,
                model.sale_deal.as_ref().unwrap().get_price(),
                referral_reward_account,
                referral_reward_memo,
            ))
        },
    )?;

    let ledger = env.get_ledger();

    let transit_sub_account = get_sale_deal_transit_sub_account(&seller);
    let transit_account = ledger.get_canister_account(&transit_sub_account);

    let transit_account_balance = env
        .get_ledger()
        .get_account_balance(transit_account)
        .await
        .map_err(to_ic_agent_error)?;

    let rewards_calculator = RewardsCalculator::new(env, sell_price).await?;

    let transfer_amount =
        rewards_calculator.calculate_referral_reward_transfer_amount(transit_account_balance);
    match transfer_amount {
        Err(reason) => {
            log_info!(
                env,
                "Referral reward: failed to calculate transfer amount, reason: {reason}."
            );
            transfer_completed(lock, None)
        }
        Ok(None) => {
            log_info!(env, "Referral reward: transfer already completed.");
            transfer_completed(lock, None)
        }
        Ok(Some(transfer_amount)) => {
            let block_index = ledger
                .transfer_from_canister(
                    Memo(referral_reward_memo),
                    transit_sub_account,
                    referral_reward_account,
                    transfer_amount,
                    rewards_calculator.get_ledger_fee(),
                    None,
                )
                .await
                .map_err(to_ic_agent_error)?
                .map_err(to_ic_agent_error)?;

            let transfer_information = TransferInformation {
                block_index,
                receiver_account_hex: referral_reward_account.to_hex(),
                amount: transfer_amount,
            };

            log_info!(
                env,
                "Referral reward: transfer completed, info: {transfer_information:?}!"
            );
            transfer_completed(lock, Some(transfer_information))
        }
    }
}

fn transfer_completed(
    lock: &HolderLock,
    transfer: Option<TransferInformation>,
) -> Result<ProcessingResult, HolderProcessingError> {
    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::SaleDeal {
                event: Box::new(SaleDealProcessingEvent::ReferralRewardTransferred { transfer }),
            },
        },
    )
    .map(|_| ProcessingResult::Continue)
}
