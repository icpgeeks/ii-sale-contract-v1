use contract_canister_api::types::holder::{
    HolderAssets, HolderProcessingError, HolderProcessingEvent, HoldingProcessingEvent,
    IdentityAccountNnsAssets, NnsHolderAssets,
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
    validate_all_accounts(env, assets, fresh_assets)?;
    validate_neurons_total(env, assets, fresh_assets)?;
    Ok(())
}

/// Validate accounts for every identity account that existed in the previous snapshot.
fn validate_all_accounts(
    env: &Environment,
    assets: &HolderAssets,
    fresh_assets: &HolderAssets,
) -> Result<(), String> {
    let before_list = match assets.nns_assets.as_ref() {
        Some(list) => list,
        None => return Ok(()),
    };

    let fresh_list = match fresh_assets.nns_assets.as_ref() {
        Some(list) => list,
        None => {
            log_error!(env, "Assets validation: no nns_assets after refetch");
            return Err("No nns_assets after refetch".to_string());
        }
    };

    for before_account in before_list {
        let fresh_account = fresh_list
            .iter()
            .find(|a| a.identity_account_number == before_account.identity_account_number);

        let fresh_account = match fresh_account {
            Some(a) => a,
            None => {
                log_error!(
                    env,
                    "Assets validation: identity account {:?} missing after refetch",
                    before_account.identity_account_number
                );
                return Err(format!(
                    "Identity account {:?} missing after refetch",
                    before_account.identity_account_number
                ));
            }
        };

        validate_account_nns_assets(env, before_account, fresh_account)?;
    }

    Ok(())
}

fn validate_account_nns_assets(
    env: &Environment,
    before: &IdentityAccountNnsAssets,
    fresh: &IdentityAccountNnsAssets,
) -> Result<(), String> {
    let before_nns = match before.assets.as_ref() {
        Some(a) => a,
        None => return Ok(()), // nothing to compare
    };

    let fresh_nns = match fresh.assets.as_ref() {
        Some(a) => a,
        None => {
            log_error!(
                env,
                "Assets validation: identity account {:?} has no nns_assets after refetch",
                before.identity_account_number
            );
            return Err(format!(
                "Identity account {:?} has no nns_assets after refetch",
                before.identity_account_number
            ));
        }
    };

    validate_accounts_for_nns_assets(env, before.identity_account_number, before_nns, fresh_nns)
}

fn validate_accounts_for_nns_assets(
    env: &Environment,
    account_number: Option<u64>,
    before: &NnsHolderAssets,
    fresh: &NnsHolderAssets,
) -> Result<(), String> {
    let before_accounts = before.accounts.as_ref().unwrap().as_ref();
    if before_accounts.is_none() {
        log_info!(
            env,
            "Assets validation: identity account {:?} — no accounts before refetch",
            account_number
        );
        return Ok(());
    }

    let fresh_accounts = fresh.accounts.as_ref().unwrap().as_ref();
    if fresh_accounts.is_none() {
        log_error!(
            env,
            "Assets validation: identity account {:?} — no accounts after refetch",
            account_number
        );
        return Err(format!(
            "Identity account {:?}: no accounts after refetch",
            account_number
        ));
    }

    let before_accounts = before_accounts.unwrap();
    let fresh_accounts = fresh_accounts.unwrap();

    // Validate main account balance
    let balance_before = before_accounts
        .main_account_information
        .as_ref()
        .and_then(|info| info.balance.as_ref())
        .map(|ts| ts.value)
        .unwrap_or_default();
    let balance_fresh = fresh_accounts
        .main_account_information
        .as_ref()
        .and_then(|info| info.balance.as_ref())
        .map(|ts| ts.value)
        .unwrap_or_default();

    if balance_before > balance_fresh {
        log_error!(
            env,
            "Assets validation: identity account {:?} — default account tokens leak detected: {} > {}",
            account_number,
            balance_before,
            balance_fresh
        );
        return Err(format!(
            "Identity account {:?}: default account tokens leak detected: {} > {}",
            account_number, balance_before, balance_fresh
        ));
    }

    // Validate sub-account balances
    for sub_account in before_accounts.sub_accounts.iter() {
        let fresh_sub_account = fresh_accounts
            .sub_accounts
            .iter()
            .find(|s| s.sub_account == sub_account.sub_account);

        let balance_before = sub_account
            .sub_account_information
            .balance
            .as_ref()
            .unwrap()
            .value;

        if fresh_sub_account.is_none() {
            let sub_account_hex = hex::encode(sub_account.sub_account.as_slice());
            log_error!(
                env,
                "Assets validation: identity account {:?} — subaccount \"{sub_account_hex}\" tokens leak detected: {balance_before} -> (empty)",
                account_number,
            );
            return Err(format!(
                "Identity account {:?}: subaccount \"{sub_account_hex}\" tokens leak detected: {balance_before} -> (empty)",
                account_number
            ));
        }

        let balance_fresh = fresh_sub_account
            .unwrap()
            .sub_account_information
            .balance
            .as_ref()
            .unwrap()
            .value;

        if balance_before > balance_fresh {
            log_error!(
                env,
                "Assets validation: identity account {:?} — subaccount \"{}\" tokens leak detected: {} > {}",
                account_number,
                hex::encode(sub_account.sub_account.as_slice()),
                balance_before,
                balance_fresh
            );
            return Err(format!(
                "Identity account {:?}: subaccount \"{}\" tokens leak detected: {} > {}",
                account_number,
                hex::encode(sub_account.sub_account.as_slice()),
                balance_before,
                balance_fresh
            ));
        }
    }

    Ok(())
}

/// Validate that total neuron value across all identity accounts has not decreased.
fn validate_neurons_total(
    env: &Environment,
    assets: &HolderAssets,
    fresh_assets: &HolderAssets,
) -> Result<(), String> {
    let neuron_value_before = compute_full_neurons_value(assets);
    let neuron_value_fresh = compute_full_neurons_value(fresh_assets);
    if neuron_value_before > neuron_value_fresh {
        log_error!(
            env,
            "Assets validation: neuron value leak detected: {} > {}",
            neuron_value_before,
            neuron_value_fresh
        );
        return Err(format!(
            "Neuron value leak detected: {neuron_value_before} > {neuron_value_fresh}"
        ));
    }
    Ok(())
}
