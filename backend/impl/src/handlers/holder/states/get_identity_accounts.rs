use common_canister_impl::components::identity::api::GetAccountsError;
use common_canister_impl::handlers::build_ic_agent_request;
use contract_canister_api::types::holder::{
    FetchAssetsEvent,
    HolderProcessingError,
    HolderProcessingEvent,
    HoldingProcessingEvent,
    IdentityAccountNumber,
    // Note: account_name comes from AccountInfo.name in the II response
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{
    execute_ic_agent_request, get_holder_model, to_ic_agent_error, to_internal_error, update_holder,
};
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(
        env,
        "Identity accounts: fetching list from Internet Identity ..."
    );

    let (identity_number, hostname, sender) = get_holder_model(|_, model| {
        (
            model.identity_number.unwrap(),
            env.get_settings().nns_hostname.clone(),
            model.get_request_sender(),
        )
    });

    let request_definition = env
        .get_identity()
        .build_get_accounts_request(&identity_number, hostname.clone());

    let ic_agent_request = build_ic_agent_request(env, request_definition, sender)
        .await
        .map_err(to_internal_error)?;

    let response_data = execute_ic_agent_request(env, ic_agent_request).await?;

    let get_accounts_result = env
        .get_identity()
        .decode_get_accounts_response(&response_data)
        .map_err(to_internal_error)?;

    let accounts: Vec<(Option<IdentityAccountNumber>, Option<String>)> = match get_accounts_result {
        Ok(response) => {
            // Build list: default account (None) + all named accounts (Some(n))
            // The default account has account_number == None in AccountInfo.
            // We include all accounts from the response.
            let mut accounts: Vec<(Option<IdentityAccountNumber>, Option<String>)> = response
                .accounts
                .iter()
                .map(|info| (info.account_number, info.name.clone()))
                .collect();

            // Ensure default account (None) is present — it should always be in the list,
            // but if the response doesn't include it explicitly, add it at the front.
            if !accounts.iter().any(|(n, _)| n.is_none()) {
                accounts.insert(0, (None, None));
            }

            log_info!(
                env,
                "Identity accounts: found {} accounts: {:?}",
                accounts.len(),
                accounts.iter().map(|(n, _)| n).collect::<Vec<_>>()
            );

            accounts
        }
        Err(error) => match error {
            GetAccountsError::NoAccounts => {
                // No accounts registered for this origin — use default account only
                log_info!(
                    env,
                    "Identity accounts: no NNS accounts found, using default account only."
                );
                vec![(None, None)]
            }
            GetAccountsError::NoSuchAnchor => {
                return Err(HolderProcessingError::InternalError {
                    error: "Identity accounts: anchor not found in Internet Identity".to_string(),
                });
            }
            GetAccountsError::InternalCanisterError(reason) => {
                return Err(to_ic_agent_error(reason));
            }
            GetAccountsError::Unauthorized(principal) => {
                return Err(HolderProcessingError::InternalError {
                    error: format!(
                        "Identity accounts: unauthorized, principal: {}",
                        principal.to_text()
                    ),
                });
            }
        },
    };

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::FetchAssets {
                event: FetchAssetsEvent::IdentityAccountsGot { hostname, accounts },
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
