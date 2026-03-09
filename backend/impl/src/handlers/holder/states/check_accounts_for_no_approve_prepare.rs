use std::collections::HashSet;

use candid::Principal;
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
    let sub_accounts: Vec<(Principal, Vec<u8>)> = get_holder_model(|_, model| {
        match &model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::CheckAssets {
                        sub_state: CheckAssetsState::CheckAccountsForNoApprovePrepare,
                        ..
                    },
            } => {
                let number_to_check = env
                    .get_settings()
                    .default_number_of_subaccounts_to_check_for_no_approve;

                let mut check_sub_accounts: HashSet<(Vec<u8>, Vec<u8>)> = HashSet::new();

                let nns_assets = model
                    .fetching_assets
                    .as_ref()
                    .and_then(|assets| assets.nns_assets.as_ref());

                if let Some(accounts_list) = nns_assets {
                    for identity_account in accounts_list {
                        // Determine the principal for this identity account
                        let principal = match identity_account.principal {
                            Some(p) => p,
                            None => continue, // skip accounts without resolved principal
                        };

                        let principal_bytes = principal.as_slice().to_vec();

                        // Add default sub account
                        check_sub_accounts
                            .insert((principal_bytes.clone(), DEFAULT_SUBACCOUNT.0.to_vec()));

                        // Add sub accounts from NNS Dapp
                        if let Some(nns_assets) = &identity_account.assets {
                            if let Some(accounts_info) = nns_assets
                                .accounts
                                .as_ref()
                                .and_then(|tm| tm.value.as_ref())
                            {
                                for sub_account in &accounts_info.sub_accounts {
                                    check_sub_accounts.insert((
                                        principal_bytes.clone(),
                                        sub_account.sub_account.to_vec(),
                                    ));
                                }
                            }
                        }

                        // Add first N calculated sub accounts
                        for i in 1..=number_to_check {
                            let mut sub_account = [0u8; 32];
                            sub_account[31] = i as u8;
                            check_sub_accounts
                                .insert((principal_bytes.clone(), sub_account.to_vec()));
                        }
                    }
                }

                Ok(check_sub_accounts
                    .into_iter()
                    .map(|(principal_bytes, subaccount)| {
                        (Principal::from_slice(&principal_bytes), subaccount)
                    })
                    .collect())
            }
            _ => Err(HolderProcessingError::InternalError {
                error: "Invalid state".to_string(),
            }),
        }
    })?;

    log_info!(
        env,
        "Account approvals: checking {} (principal, sub_account) pairs.",
        sub_accounts.len(),
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
