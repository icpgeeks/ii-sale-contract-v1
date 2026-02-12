use common_canister_types::TransferInformation;
use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent, SaleDealProcessingEvent,
};
use ic_ledger_types::Memo;

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, to_ic_agent_error, update_holder};
use crate::handlers::rewards_calculator::RewardsCalculator;
use crate::handlers::wallet::get_sale_deal_transit_sub_account;
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Developer reward: transferring ...");

    let (seller, sell_price, contract_template_id) = get_holder_model(|state, model| {
        Ok((
            model.owner.as_ref().unwrap().value,
            model.sale_deal.as_ref().unwrap().get_price(),
            state
                .get_model()
                .get_init_contract_args()
                .certificate
                .contract_certificate
                .contract_template_id,
        ))
    })?;

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
        rewards_calculator.calculate_developer_reward_transfer_amount(transit_account_balance);

    match transfer_amount {
        Err(reason) => {
            log_info!(
                env,
                "Developer reward: failed to calculate transfer amount, reason: {reason}."
            );
            transfer_completed(lock, None)
        }
        Ok(None) => {
            log_info!(env, "Developer reward: transfer already completed.");
            transfer_completed(lock, None)
        }
        Ok(Some(transfer_amount)) => {
            let receiver_account = env.get_settings().developer_reward_account;

            let block_index = ledger
                .transfer_from_canister(
                    Memo(contract_template_id),
                    transit_sub_account,
                    receiver_account,
                    transfer_amount,
                    rewards_calculator.get_ledger_fee(),
                    None,
                )
                .await
                .map_err(to_ic_agent_error)?
                .map_err(to_ic_agent_error)?;

            let transfer_information = TransferInformation {
                block_index,
                receiver_account_hex: receiver_account.to_hex(),
                amount: transfer_amount,
            };

            log_info!(
                env,
                "Developer reward: transfer completed, info: {transfer_information:?}."
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
                event: Box::new(SaleDealProcessingEvent::DeveloperRewardTransferred { transfer }),
            },
        },
    )
    .map(|_| ProcessingResult::Continue)
}
