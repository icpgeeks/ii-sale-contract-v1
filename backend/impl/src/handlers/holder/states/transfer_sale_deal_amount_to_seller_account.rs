use common_canister_impl::components::ledger::to_account_identifier;
use common_canister_types::{TokenE8s, TransferInformation};
use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent, SaleDealProcessingEvent,
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
    let (seller, sell_price, receiver_account, contract_template_id) =
        get_holder_model(|state, model| {
            to_account_identifier(&model.sale_deal.as_ref().unwrap().receiver_account)
                .map_err(to_internal_error)
                .map(|account| {
                    (
                        model.owner.as_ref().unwrap().value,
                        model.sale_deal.as_ref().unwrap().get_price(),
                        account,
                        state
                            .get_model()
                            .get_init_contract_args()
                            .certificate
                            .contract_certificate
                            .contract_template_id,
                    )
                })
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
    let ledger_fee = rewards_calculator.get_ledger_fee();
    let seller_amount = rewards_calculator
        .get_seller_amount()
        .map_err(to_internal_error)?;

    if transit_account_balance <= ledger_fee {
        log_info!(env, "Transfer to seller account already completed.");
        return transfer_completed(lock, seller_amount, None);
    }

    let transfer_amount = transit_account_balance.saturating_sub(ledger_fee);
    let block_index = ledger
        .transfer_from_canister(
            Memo(contract_template_id),
            transit_sub_account,
            receiver_account,
            transfer_amount,
            ledger_fee,
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
        "Transfer to seller account completed: {transfer_information:?}."
    );

    transfer_completed(lock, seller_amount, Some(transfer_information))
}

fn transfer_completed(
    lock: &HolderLock,
    seller_amount: TokenE8s,
    transfer: Option<TransferInformation>,
) -> Result<ProcessingResult, HolderProcessingError> {
    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::SaleDeal {
                event: Box::new(SaleDealProcessingEvent::SaleDealAmountToSellerTransferred {
                    seller_amount,
                    transfer,
                }),
            },
        },
    )
    .map(|_| ProcessingResult::Continue)
}
