use common_canister_impl::components::identity::api::{AccountInfo, GetAccountsError};
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
        Ok(response) => build_accounts_list(env, response),
        Err(error) => match error {
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

fn build_accounts_list(
    env: &Environment,
    response: Vec<AccountInfo>,
) -> Vec<(Option<IdentityAccountNumber>, Option<String>)> {
    if response.is_empty() {
        // II returns an empty list only when the origin has never been used at all.
        // In that case the synthetic account (account_number == None) is the one and
        // only account that exists for this (anchor, origin) pair.
        log_info!(
            env,
            "Identity accounts: no NNS accounts found, using default synthetic account only."
        );
        return vec![(None, None)];
    }

    // II always includes the synthetic account (account_number == None) as the first
    // element when it is still the default. If the user has renamed the default account
    // it becomes a numbered account (Some(n)) and the synthetic entry is no longer
    // returned — the numbered account takes its place as the principal for that slot.
    // We trust the response exactly as returned and do NOT inject a synthetic (None)
    // entry ourselves, because doing so would create a ghost slot pointing to a
    // different principal than the actual default account.
    let accounts: Vec<(Option<IdentityAccountNumber>, Option<String>)> = response
        .iter()
        .map(|info| (info.account_number, info.name.clone()))
        .collect();

    log_info!(
        env,
        "Identity accounts: found {} accounts: {:?}",
        accounts.len(),
        accounts.iter().map(|(n, _)| n).collect::<Vec<_>>()
    );

    accounts
}
