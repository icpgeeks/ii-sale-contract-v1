use common_canister_impl::components::icrc2_ledger::{
    to_icrc1_account, Account, TransferFromArgs, TransferFromError,
};
use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HolderState, HoldingProcessingEvent,
    HoldingState, SaleDealProcessingEvent, SaleDealState,
};
use icrc_ledger_types::icrc1::account::principal_to_subaccount;
use icrc_ledger_types::icrc1::transfer::Memo;
use num_traits::ToPrimitive;

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, to_ic_agent_error, update_holder};
use crate::handlers::wallet::get_sale_deal_transit_sub_account;
use crate::model::holder::events::sale::get_buyer_offer;
use crate::model::holder::HolderLock;
use crate::{log_error, log_info};

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let (buyer, seller, sale_price, approved_account, contract_template_id) =
        get_holder_model(|state, model| {
            let buyer = match &model.state.value {
                HolderState::Holding {
                    sub_state:
                        HoldingState::Hold {
                            sale_deal_state: Some(SaleDealState::Accept { buyer, .. }),
                            ..
                        },
                } => buyer,
                _ => panic!(),
            };

            let buyer_offer = get_buyer_offer(model, buyer).unwrap();

            (
                *buyer,
                model.owner.as_ref().unwrap().value,
                model.sale_deal.as_ref().unwrap().get_price(),
                buyer_offer.value.approved_account.clone(),
                state
                    .get_model()
                    .get_init_contract_args()
                    .certificate
                    .contract_certificate
                    .contract_template_id,
            )
        });

    let ledger = env.get_ledger();

    let transit_sub_account = get_sale_deal_transit_sub_account(&seller);
    let transit_account = ledger.get_canister_account(&transit_sub_account);

    let ledger_fee = ledger.get_ledger_fee().await.map_err(to_ic_agent_error)?;
    let transfer_amount = sale_price.saturating_sub(ledger_fee);

    let transit_account_balance = env
        .get_ledger()
        .get_account_balance(transit_account)
        .await
        .map_err(to_ic_agent_error)?;

    if transfer_amount <= transit_account_balance {
        log_info!(env, "Transit already has sufficient funds.");
        return transit_completed(lock, None);
    }

    match env
        .get_icrc2_ledger()
        .icrc2_transfer_from(TransferFromArgs {
            spender_subaccount: Some(principal_to_subaccount(buyer)),
            from: to_icrc1_account(&approved_account).unwrap(),
            to: Account {
                owner: env.get_ic().get_canister(),
                subaccount: Some(transit_sub_account.0),
            },
            amount: transfer_amount.into(),
            fee: Some(ledger_fee.into()),
            memo: Some(Memo::from(contract_template_id)),
            created_at_time: None,
        })
        .await
        .map_err(to_ic_agent_error)?
    {
        Ok(block_index) => {
            log_info!(env, "Transit completed, block index {block_index}.");
            transit_completed(lock, block_index.0.to_u64())
        }
        Err(reason) => {
            log_error!(env, "Transit failed, reason: {reason:?}.");
            transit_failed(lock, reason)
        }
    }
}

fn transit_completed(
    lock: &HolderLock,
    block_index: Option<u64>,
) -> Result<ProcessingResult, HolderProcessingError> {
    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::SaleDeal {
                event: Box::new(
                    SaleDealProcessingEvent::SaleDealAmountToTransitTransferred { block_index },
                ),
            },
        },
    )
    .map(|_| ProcessingResult::Continue)
}

fn transit_failed(
    lock: &HolderLock,
    reason: TransferFromError,
) -> Result<ProcessingResult, HolderProcessingError> {
    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::SaleDeal {
                event: Box::new(
                    SaleDealProcessingEvent::TransferSaleDealAmountToTransitFailed {
                        reason: format!("{reason:?}").to_owned(),
                    },
                ),
            },
        },
    )
    .map(|_| ProcessingResult::Continue)
}
