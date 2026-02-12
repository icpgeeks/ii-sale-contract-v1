use contract_canister_api::types::holder::{
    CaptureProcessingEvent, HolderProcessingError, HolderProcessingEvent,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, to_internal_error, update_holder};
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "ECDSA key: creation started ...");

    let derivation_path = get_holder_model(|_, model| model.get_derivation_path());

    let ecdsa_key = env
        .get_ecdsa()
        .get_ecdsa_key(derivation_path)
        .await
        .map_err(to_internal_error)?;

    log_info!(env, "ECDSA key: '{ecdsa_key:?}' created.");

    update_holder(
        lock,
        HolderProcessingEvent::Capturing {
            event: CaptureProcessingEvent::EcdsaKeyCreated { ecdsa_key },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
