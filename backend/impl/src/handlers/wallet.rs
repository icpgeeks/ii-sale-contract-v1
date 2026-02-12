use candid::Principal;
use common_canister_impl::components::{
    icrc2_ledger::to_icrc1_account, ledger::to_account_identifier,
};
use common_canister_types::{millis_to_nanos, LedgerAccount, TimestampMillis, TokenE8s};
use contract_canister_api::types::holder::CheckApprovedBalanceError;
use ic_ledger_types::Subaccount;
use icrc_ledger_types::{
    icrc1::account::{principal_to_subaccount, Account},
    icrc2::allowance::AllowanceArgs,
};
use sha2::{Digest, Sha256};

use crate::components::Environment;

pub(crate) fn get_sale_deal_transit_sub_account(seller: &Principal) -> Subaccount {
    Subaccount({
        let mut hasher = Sha256::new();
        hasher.update([0x0c]);
        hasher.update(b"seller");
        hasher.update(seller.as_slice());
        hasher.finalize().into()
    })
}

/// Check if the approved account has enough balance and is not expired.
pub(crate) async fn check_approved_balance(
    env: &Environment,
    sub_account_principal: Principal,
    approved_account: &LedgerAccount,
    amount: TokenE8s,
    approve_expiration: TimestampMillis,
) -> Result<(), CheckApprovedBalanceError> {
    let approved_account_identifier = to_account_identifier(approved_account)
        .map_err(|reason| CheckApprovedBalanceError::InvalidApprovedAccount { reason })?;

    let approved_account_icrc1 = to_icrc1_account(approved_account)
        .map_err(|reason| CheckApprovedBalanceError::InvalidApprovedAccount { reason })?;

    let balance = env
        .get_ledger()
        .get_account_balance(approved_account_identifier)
        .await
        .map_err(|reason| CheckApprovedBalanceError::LedgerUnavailable { reason })?;

    if balance < amount {
        return Err(CheckApprovedBalanceError::InsufficientBalance);
    }

    let allowance = env
        .get_icrc2_ledger()
        .icrc2_allowance(AllowanceArgs {
            account: approved_account_icrc1,
            spender: Account {
                owner: env.get_ic().get_canister(),
                subaccount: Some(principal_to_subaccount(sub_account_principal)),
            },
        })
        .await
        .map_err(|error| CheckApprovedBalanceError::LedgerUnavailable {
            reason: format!("{error:?}"),
        })?;

    if allowance.allowance < amount {
        return Err(CheckApprovedBalanceError::InsufficientAllowance);
    }

    if let Some(expires_at) = allowance.expires_at {
        if (expires_at as u128) < millis_to_nanos(&approve_expiration) {
            return Err(CheckApprovedBalanceError::AllowanceExpiresTooEarly);
        }
    }

    Ok(())
}
