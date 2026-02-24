use contract_canister_api::types::holder::{
    FetchAssetsEvent, FetchAssetsState, FetchIdentityAccountsNnsAssetsState, HolderProcessingError,
    HolderProcessingEvent, HolderState, HoldingProcessingEvent, HoldingState,
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
    let current_state = get_holder_model(|_, model| match &model.state.value {
        HolderState::Holding { sub_state } => sub_state.clone(),
        _ => panic!("finish_fetch_assets: unexpected top-level state"),
    });

    match current_state {
        HoldingState::FetchAssets {
            fetch_assets_state:
                FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                    sub_state:
                        FetchIdentityAccountsNnsAssetsState::FinishCurrentNnsAccountFetch {
                            identity_account_number,
                        },
                },
            ..
        } => {
            log_info!(
                env,
                "Assets fetch: completed for account {:?}.",
                identity_account_number
            );

            update_holder(
                lock,
                HolderProcessingEvent::Holding {
                    event: HoldingProcessingEvent::FetchAssets {
                        event: FetchAssetsEvent::NnsAssetsForAccountFetched {
                            identity_account_number,
                        },
                    },
                },
            )?;
        }

        HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::FinishFetchAssets,
            ..
        } => {
            log_info!(env, "Assets fetch: all accounts completed.");

            update_holder(
                lock,
                HolderProcessingEvent::Holding {
                    event: HoldingProcessingEvent::FetchAssets {
                        event: FetchAssetsEvent::FetchAssetsFinished,
                    },
                },
            )?;
        }

        other => {
            panic!("finish_fetch_assets: unexpected holding state: {:?}", other);
        }
    }

    Ok(ProcessingResult::Continue)
}
