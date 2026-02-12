use contract_canister_api::types::holder::{
    FetchAssetsEvent, HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent,
};
use ic_ledger_types::AccountIdentifier;

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, to_ic_agent_error, update_holder};
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let account_identifier = get_holder_model(|_, model| {
        model
            .fetching_assets
            .as_ref()
            .unwrap()
            .accounts
            .as_ref()
            .unwrap()
            .value
            .as_ref()
            .and_then(|accounts| {
                if let Some(main_account) = &accounts.main_account_information {
                    if main_account.balance.is_none() {
                        return Some(main_account.account_identifier.clone());
                    }
                }

                for sub_account in &accounts.sub_accounts {
                    if sub_account.sub_account_information.balance.is_none() {
                        return Some(
                            sub_account
                                .sub_account_information
                                .account_identifier
                                .clone(),
                        );
                    }
                }

                None
            })
    });

    if let Some(account_identifier) = account_identifier {
        return get_account_balance(env, lock, account_identifier).await;
    }

    log_info!(env, "All account balances retrieved.");

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::AccountsBalancesObtained,
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}

async fn get_account_balance(
    env: &Environment,
    lock: &HolderLock,
    account_identifier: Vec<u8>,
) -> Result<ProcessingResult, HolderProcessingError> {
    let balance = env
        .get_ledger()
        .get_account_balance(AccountIdentifier::from_slice(account_identifier.as_slice()).unwrap())
        .await
        .map_err(to_ic_agent_error)?;

    log_info!(
        env,
        "Account '{account_identifier:?}': balance retrieved ({balance})."
    );

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::AccountBalanceObtained {
                    account_identifier,
                    balance,
                },
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
