use contract_canister_api::types::holder::{
    CancelSaleDealState, HolderProcessingError, HolderProcessingEvent, HolderState,
    HoldingProcessingEvent, HoldingState, SaleDealAcceptSubState, SaleDealProcessingEvent,
    SaleDealState,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, update_holder};
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    _env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let sale_deal_state = get_holder_model(|_, model| match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::CancelSaleDeal {
                    sub_state: CancelSaleDealState::StartCancelSaleDeal { sale_deal_state },
                    ..
                },
        } => *sale_deal_state.clone(),
        _ => panic!(),
    });

    let event = match sale_deal_state {
        SaleDealState::Accept { sub_state, buyer } => match sub_state {
            SaleDealAcceptSubState::StartAccept => SaleDealProcessingEvent::SaleDealCanceled,
            _ => SaleDealProcessingEvent::RefundBuyerFromTransitAccount { buyer },
        },
        _ => SaleDealProcessingEvent::SaleDealCanceled,
    };

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::SaleDeal {
                event: Box::new(event),
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
