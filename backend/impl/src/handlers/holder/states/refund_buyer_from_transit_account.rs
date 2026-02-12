use candid::Principal;
use common_canister_impl::components::ledger::to_account_identifier;
use common_canister_types::TransferInformation;
use contract_canister_api::types::holder::{
    CancelSaleDealState, HolderProcessingError, HolderProcessingEvent, HolderState,
    HoldingProcessingEvent, HoldingState, SaleDealProcessingEvent,
};
use ic_ledger_types::Memo;

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, to_ic_agent_error, update_holder};
use crate::handlers::wallet::get_sale_deal_transit_sub_account;
use crate::log_info;
use crate::model::holder::events::sale::get_buyer_offer;
use crate::model::holder::HolderLock;

/// refund funds from the transit account to the buyer
pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let (seller, buyer, refund_account, contract_template_id) = get_holder_model(|state, model| {
        if let HolderState::Holding {
            sub_state:
                HoldingState::CancelSaleDeal {
                    sub_state: CancelSaleDealState::RefundBuyerFromTransitAccount { buyer },
                    ..
                },
        } = &model.state.value
        {
            let buyer_offer = get_buyer_offer(model, buyer).unwrap();

            (
                model.owner.as_ref().unwrap().value,
                *buyer,
                to_account_identifier(&buyer_offer.approved_account).unwrap(),
                state
                    .get_model()
                    .get_init_contract_args()
                    .certificate
                    .contract_certificate
                    .contract_template_id,
            )
        } else {
            panic!()
        }
    });

    let ledger = env.get_ledger();

    let transit_sub_account = get_sale_deal_transit_sub_account(&seller);
    let transit_account = ledger.get_canister_account(&transit_sub_account);

    let transit_account_balance = env
        .get_ledger()
        .get_account_balance(transit_account)
        .await
        .map_err(to_ic_agent_error)?;

    let ledger_fee = ledger.get_ledger_fee().await.map_err(to_ic_agent_error)?;

    if transit_account_balance <= ledger_fee {
        log_info!(
            env,
            "Transfer to buyer from transit account already completed."
        );
        return transfer_completed(lock, buyer, None);
    }

    let transfer_amount = transit_account_balance.saturating_sub(ledger_fee);
    let block_index = ledger
        .transfer_from_canister(
            Memo(contract_template_id),
            transit_sub_account,
            refund_account,
            transfer_amount,
            ledger_fee,
            None,
        )
        .await
        .map_err(to_ic_agent_error)?
        .map_err(to_ic_agent_error)?;

    let transfer_information = TransferInformation {
        block_index,
        receiver_account_hex: refund_account.to_hex(),
        amount: transfer_amount,
    };

    log_info!(
        env,
        "Transfer to buyer from transit account completed: {transfer_information:?}!"
    );
    transfer_completed(lock, buyer, Some(transfer_information))
}

fn transfer_completed(
    lock: &HolderLock,
    buyer: Principal,
    refund: Option<TransferInformation>,
) -> Result<ProcessingResult, HolderProcessingError> {
    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::SaleDeal {
                event: Box::new(SaleDealProcessingEvent::BuyerFromTransitAccountRefunded {
                    buyer,
                    refund,
                }),
            },
        },
    )
    .map(|_| ProcessingResult::Continue)
}
