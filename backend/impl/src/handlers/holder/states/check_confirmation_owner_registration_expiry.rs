use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HolderState, ReleaseProcessingEvent, ReleaseState,
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
        if let HolderState::Release {
            sub_state: ReleaseState::WaitingAuthnMethodRegistration { expiration, .. },
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

    log_info!(env, "Owner authn registration mode: confirmation expired.");

    update_holder(
        lock,
        HolderProcessingEvent::Releasing {
            event: ReleaseProcessingEvent::AuthnMethodRegistrationExpired,
        },
    )?;

    Ok(ProcessingResult::Continue)
}
