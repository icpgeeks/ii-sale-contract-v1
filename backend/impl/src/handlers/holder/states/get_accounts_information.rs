use common_canister_impl::components::nns_dap::api::GetAccountResponse;
use contract_canister_api::types::holder::{
    AccountInformation, AccountsInformation, FetchAssetsEvent, HolderProcessingError,
    HolderProcessingEvent, HoldingProcessingEvent, SubAccountInformation,
};
use ic_ledger_types::AccountIdentifier;

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{to_internal_error, update_holder};
use crate::model::holder::HolderLock;
use crate::{log_error, log_info};

use super::{
    build_ic_agent_request_with_check_delegation, execute_ic_agent_request, get_holder_model,
};

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let ic_agent_request = build_ic_agent_request_with_check_delegation(
        env,
        lock,
        env.get_nns_dapp().build_get_account_request(),
        get_holder_model(|_, model| model.get_request_sender_with_delegation()),
    )
    .await?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

    let account_response = env
        .get_nns_dapp()
        .decode_get_account_response(&response_data)
        .map_err(to_internal_error)?;

    log_info!(
        env,
        "Account information: received: {:?}.",
        account_response
    );

    let accounts_information = match account_response {
        GetAccountResponse::AccountNotFound => None,
        GetAccountResponse::Ok(account_details) => {
            let sub_accounts = account_details
                .sub_accounts
                .iter()
                .filter_map(|sa| {
                    str_to_account_identifier(
                        sa.account_identifier.as_str(),
                    )
                    .map(|ai| SubAccountInformation {
                        name: sa.name.clone(),
                        sub_account: sa.sub_account.as_ref().to_vec(),
                        sub_account_information: AccountInformation {
                            account_identifier:ai.as_bytes().to_vec(),
                            balance: None,
                        },
                    })
                    .inspect_err(|error| {
                        log_error!(env, "Subaccount '{}': skipped, cannot parse account identifier: {error}.", sa.name);
                    })
                    .ok()
                    })
                .collect::<Vec<SubAccountInformation>>();
            if sub_accounts.len() > env.get_settings().max_subaccounts_allowed {
                log_error!(
                    env,
                    "Subaccounts: too many detected: {}.",
                    sub_accounts.len()
                );
                update_holder(
                    lock,
                    HolderProcessingEvent::Holding {
                        event: HoldingProcessingEvent::FetchAssets {
                            event: FetchAssetsEvent::TooManyAccounts,
                        },
                    },
                )?;
                return Ok(ProcessingResult::Continue);
            }
            Some(AccountsInformation {
                principal: account_details.principal,
                main_account_information: str_to_account_identifier(
                    account_details.account_identifier.as_str(),
                )
                .map(|ai| AccountInformation {
                    account_identifier: ai.as_bytes().to_vec(),
                    balance: None,
                })
                .inspect_err(|error| {
                    log_error!(
                        env,
                        "Main account: skipped, cannot parse account identifier: {error}."
                    );
                })
                .ok(),
                sub_accounts,
            })
        }
    };

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::AccountsInformationGot {
                    accounts_information,
                },
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}

fn str_to_account_identifier(account_identifier: &str) -> Result<AccountIdentifier, String> {
    match hex::decode(account_identifier) {
        Ok(array) => {
            if array.len() != 32 {
                return Err(format!(
                    "Account identifier {account_identifier} length: {} != 32",
                    array.len()
                ));
            }

            let mut bytes = [0; 32];
            bytes.copy_from_slice(array.as_slice());

            AccountIdentifier::try_from(bytes)
                .map_err(|error| format!("Can not build account identifier: {error:?}"))
        }
        Err(error) => Err(format!(
            "Account identifier {account_identifier} hex is incorrect: {error}"
        )),
    }
}
