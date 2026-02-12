use contract_canister_api::types::holder::{
    HolderAssets, HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, update_holder};
use crate::model::holder::{compute_full_neurons_value, HolderLock};
use crate::{log_error, log_info};

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let validate_result = get_holder_model(|_, model| {
        validate_assets(
            env,
            &model.assets.as_ref().unwrap().value,
            model.fetching_assets.as_ref().unwrap(),
        )
    });

    let event = validate_result
        .map(|_| {
            log_info!(env, "Assets validation: success.");
            HoldingProcessingEvent::AssetsValidated
        })
        .unwrap_or_else(|reason| {
            log_error!(env, "Assets validation: failed {reason}");
            HoldingProcessingEvent::ValidateAssetsFailed { reason }
        });

    update_holder(lock, HolderProcessingEvent::Holding { event })?;
    Ok(ProcessingResult::Continue)
}

fn validate_assets(
    env: &Environment,
    assets: &HolderAssets,
    fresh_assets: &HolderAssets,
) -> Result<(), String> {
    validate_accounts(env, assets, fresh_assets)?;
    validate_neurons(env, assets, fresh_assets)?;
    Ok(())
}

fn validate_accounts(
    env: &Environment,
    assets: &HolderAssets,
    fresh_assets: &HolderAssets,
) -> Result<(), String> {
    let before_accounts = assets.accounts.as_ref().unwrap().as_ref();
    if before_accounts.is_none() {
        log_info!(env, "Assets validation: no accounts before refetch");
        return Ok(());
    }
    let fresh_accounts = fresh_assets.accounts.as_ref().unwrap().as_ref();
    if fresh_accounts.is_none() {
        log_error!(env, "Assets validation: no accounts after refetch");
        return Err("No accounts after refetch".to_string());
    }
    let balance_before = before_accounts
        .unwrap()
        .main_account_information
        .as_ref()
        .and_then(|info| info.balance.as_ref())
        .map(|ts| ts.value)
        .unwrap_or_default();
    let balance_fresh = fresh_accounts
        .unwrap()
        .main_account_information
        .as_ref()
        .and_then(|info| info.balance.as_ref())
        .map(|ts| ts.value)
        .unwrap_or_default();
    if balance_before > balance_fresh {
        log_error!(env, "Assets validation: default account tokens leak detected: {balance_before} > {balance_fresh}");
        return Err(format!(
            "Default account tokens leak detected: {balance_before} > {balance_fresh}"
        ));
    }
    validate_subaccount_balances(env, fresh_assets, before_accounts)
}

fn validate_subaccount_balances(
    env: &Environment,
    fresh_assets: &HolderAssets,
    before_accounts: Option<&contract_canister_api::types::holder::AccountsInformation>,
) -> Result<(), String> {
    // check subaccounts balances
    for sub_account in before_accounts.unwrap().sub_accounts.iter() {
        let fresh_sub_account = fresh_assets
            .accounts
            .as_ref()
            .unwrap()
            .as_ref()
            .unwrap()
            .sub_accounts
            .iter()
            .find(|now_sub_account| now_sub_account.sub_account == sub_account.sub_account);
        let balance_before = sub_account
            .sub_account_information
            .balance
            .as_ref()
            .unwrap()
            .value;
        if fresh_sub_account.is_none() {
            let sub_account_hex = hex::encode(sub_account.sub_account.as_slice());
            log_error!(env, "Assets validation: subaccount \"{sub_account_hex}\" tokens leak detected: {balance_before} -> (empty)",);
            return Err(format!("Subaccount \"{sub_account_hex}\" tokens leak detected: {balance_before} -> (empty)"));
        }
        let fresh_sub_account = fresh_sub_account.unwrap();
        let balance_fresh = fresh_sub_account
            .sub_account_information
            .balance
            .as_ref()
            .unwrap()
            .value;
        if balance_before > balance_fresh {
            log_error!(env,
                "Assets validation: subaccount \"{}\" tokens leak detected: {balance_before} > {balance_fresh}",
                hex::encode(sub_account.sub_account.as_slice())
            );
            return Err(format!(
                "Subaccount \"{}\" tokens leak detected: {balance_before} > {balance_fresh}",
                hex::encode(sub_account.sub_account.as_slice())
            ));
        }
    }
    Ok(())
}

fn validate_neurons(
    env: &Environment,
    assets: &HolderAssets,
    fresh_assets: &HolderAssets,
) -> Result<(), String> {
    let neuron_value_before = compute_full_neurons_value(assets);
    let neuron_value_fresh = compute_full_neurons_value(fresh_assets);
    if neuron_value_before > neuron_value_fresh {
        log_error!(env, "Assets validation: neuron value leak detected: {neuron_value_before} > {neuron_value_fresh}");
        return Err(format!(
            "Neuron value leak detected: {neuron_value_before} > {neuron_value_fresh}"
        ));
    }
    Ok(())
}
