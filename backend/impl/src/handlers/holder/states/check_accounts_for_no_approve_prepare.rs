use std::collections::HashSet;

use contract_canister_api::types::holder::{
    CheckAssetsEvent, CheckAssetsState, HolderProcessingError, HolderProcessingEvent, HolderState,
    HoldingProcessingEvent, HoldingState,
};
use ic_ledger_types::DEFAULT_SUBACCOUNT;

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, update_holder};
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let sub_accounts: Vec<Vec<u8>> = get_holder_model(|_, model| {
        match &model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::CheckAssets {
                        sub_state: CheckAssetsState::CheckAccountsForNoApprovePrepare,
                        ..
                    },
            } => {
                let mut check_sub_accounts = HashSet::new();

                // add default sub account
                check_sub_accounts.insert(DEFAULT_SUBACCOUNT.0.to_vec());

                // add sub accounts
                model
                    .fetching_assets
                    .as_ref()
                    .and_then(|assets| assets.accounts.as_ref())
                    .and_then(|tm| tm.value.as_ref())
                    .inspect(|accounts| {
                        accounts.sub_accounts.iter().for_each(|account| {
                            check_sub_accounts.insert(account.sub_account.to_vec());
                        });
                    });

                // add first calculated sub accounts
                let number_to_check = env
                    .get_settings()
                    .default_number_of_subaccounts_to_check_for_no_approve;

                for i in 1..=number_to_check {
                    let mut sub_account = [0u8; 32];
                    sub_account[31] = i as u8;
                    check_sub_accounts.insert(sub_account.to_vec());
                }

                Ok(check_sub_accounts.into_iter().collect())
            }
            _ => Err(HolderProcessingError::InternalError {
                error: "Invalid state".to_string(),
            }),
        }
    })?;

    log_info!(
        env,
        "Account approvals: checking {:?} sub accounts.",
        sub_accounts
            .iter()
            .map(hex::encode)
            .collect::<Vec<String>>()
    );

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::CheckAssets {
                event: CheckAssetsEvent::CheckAccountsPrepared { sub_accounts },
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
