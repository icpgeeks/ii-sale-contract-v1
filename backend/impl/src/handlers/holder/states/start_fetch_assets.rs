use contract_canister_api::types::holder::{
    DelegationState, FetchAssetsEvent, FetchAssetsState, FetchNnsAssetsState,
    HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::update_holder;
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Fetch assets: started ...");

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::FetchAssetsStarted {
                    fetch_assets_state: FetchAssetsState::ObtainDelegationState {
                        sub_state: DelegationState::NeedPrepareDelegation {
                            hostname: env.get_settings().nns_hostname.clone(),
                        },
                        wrap_fetch_state: Box::new(FetchAssetsState::FetchNnsAssetsState {
                            sub_state: FetchNnsAssetsState::GetNeuronsIds,
                        }),
                    },
                },
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
