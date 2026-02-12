use contract_canister_api::types::holder::{
    CaptureProcessingEvent, CaptureState, HolderProcessingError, HolderProcessingEvent, HolderState,
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
    let expiration = get_holder_model(|_, model| {
        if let HolderState::Capture {
            sub_state: CaptureState::NeedConfirmAuthnMethodSessionRegistration { expiration, .. },
            ..
        } = &model.state.value
        {
            *expiration
        } else {
            panic!()
        }
    });

    if now < expiration {
        return Ok(ProcessingResult::Schedule {
            scheduled_time: expiration,
        });
    }

    log_info!(
        env,
        "Holder authn session registration: confirmation expired."
    );

    update_holder(
        lock,
        HolderProcessingEvent::Capturing {
            event: CaptureProcessingEvent::AuthnMethodSessionRegistrationExpired,
        },
    )?;

    Ok(ProcessingResult::Continue)
}
