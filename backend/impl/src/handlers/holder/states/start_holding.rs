use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::update_holder;
use crate::model::holder::HolderLock;
use crate::{log_info, read_state};

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let settings = env.get_settings();
    let now = env.get_time().get_current_unix_epoch_time_millis();

    let quarantine_completion_time = now + settings.quarantine_duration;

    let certificate_expiration = read_state(|state| {
        state
            .get_model()
            .get_init_contract_args()
            .certificate
            .contract_certificate
            .expiration
    });

    let sale_deal_safe_expiration_time =
        certificate_expiration - settings.sale_deal_safe_close_duration;

    let event = if quarantine_completion_time < sale_deal_safe_expiration_time {
        log_info!(env, "Holding: started.");

        HoldingProcessingEvent::HoldingStarted {
            quarantine_completion_time,
        }
    } else {
        log_info!(
            env,
            "Holding: start rejected. Sale deal expires before quarantine end date."
        );
        HoldingProcessingEvent::HoldingStartExpired
    };

    update_holder(lock, HolderProcessingEvent::Holding { event })?;

    Ok(ProcessingResult::Continue)
}
