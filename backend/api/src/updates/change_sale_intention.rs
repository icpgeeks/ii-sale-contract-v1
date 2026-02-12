use candid::CandidType;
use common_canister_types::{DelayedTimestampMillis, LedgerAccount};
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = ChangeSaleIntentionArgs;
pub type Response = ChangeSaleIntentionResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct ChangeSaleIntentionArgs {
    pub receiver_account: LedgerAccount,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum ChangeSaleIntentionResponse {
    Ok(ChangeSaleIntentionResult),
    Err(ChangeSaleIntentionError),
}

pub type ChangeSaleIntentionResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum ChangeSaleIntentionError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
    InvalidAccountIdentifier,
}

impl From<Result<ChangeSaleIntentionResult, ChangeSaleIntentionError>>
    for ChangeSaleIntentionResponse
{
    fn from(result: Result<ChangeSaleIntentionResult, ChangeSaleIntentionError>) -> Self {
        match result {
            Ok(ok) => ChangeSaleIntentionResponse::Ok(ok),
            Err(err) => ChangeSaleIntentionResponse::Err(err),
        }
    }
}
