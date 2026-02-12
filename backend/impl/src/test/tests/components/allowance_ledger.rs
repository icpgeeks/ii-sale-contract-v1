use async_trait::async_trait;
use common_canister_impl::components::allowance_ledger::api::{Allowance, Allowances};
use common_canister_impl::components::allowance_ledger::interface::AllowanceLedger;
use common_canister_impl::components::allowance_ledger::interface_impl::from_account_to_account_identifier_hex;
use common_canister_types::{millis_to_nanos, TimestampMillis, TimestampNanos, TokenE8s};
use ic_cdk::call::CallResult;
use ic_ledger_types::Tokens;
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc103::get_allowances::GetAllowancesArgs;
use std::cell::RefCell;
use std::collections::BTreeMap;

thread_local! {
    static __TABLE: RefCell<BTreeMap<(Account, Account), (TimestampNanos, TokenE8s)>> = RefCell::default();
}

pub(crate) fn ht_approve_account(
    account: Account,
    spender: Account,
    expires_at: TimestampMillis,
    tokens: TokenE8s,
) {
    __TABLE.with(|table| {
        let mut t = table.borrow_mut();
        t.insert((account, spender), (millis_to_nanos(&expires_at), tokens));
    });
}

pub struct AllowanceLedgerTest {}

#[async_trait]
impl AllowanceLedger for AllowanceLedgerTest {
    async fn get_allowances(&self, arg: GetAllowancesArgs) -> CallResult<Allowances> {
        let account = &Account {
            owner: arg.from_account.unwrap().owner,
            subaccount: arg.from_account.unwrap().subaccount,
        };

        let mut result = Vec::new();
        __TABLE.with(|table| {
            for ((acc, spender), data) in table.borrow().iter() {
                if acc == account {
                    result.push(Allowance {
                        from_account_id: from_account_to_account_identifier_hex(acc),
                        to_spender_id: from_account_to_account_identifier_hex(spender),
                        allowance: Tokens::from_e8s(data.1),
                        expires_at: Some(data.0 as u64),
                    });
                }
                if (result.len() as u64) >= arg.take.clone().unwrap_or_default() {
                    break;
                }
            }
            return Ok(result);
        })
    }
}
