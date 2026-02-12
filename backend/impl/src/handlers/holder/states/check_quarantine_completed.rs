use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HolderState, HoldingProcessingEvent, HoldingState,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, update_holder};
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let now = env.get_time().get_current_unix_epoch_time_millis();
    let quarantine_complete_time = get_holder_model(|_, model| {
        if let HolderState::Holding {
            sub_state:
                HoldingState::Hold {
                    quarantine: Some(time),
                    ..
                },
        } = &model.state.value
        {
            *time
        } else {
            panic!()
        }
    });

    if now <= quarantine_complete_time {
        return Ok(ProcessingResult::Schedule {
            scheduled_time: quarantine_complete_time,
        });
    }

    log_info!(env, "Quarantine: completed.");

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::QuarantineCompleted,
        },
    )?;

    Ok(ProcessingResult::Continue)
}
