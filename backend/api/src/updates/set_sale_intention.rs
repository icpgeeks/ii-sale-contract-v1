use candid::CandidType;
use common_canister_types::{DelayedTimestampMillis, LedgerAccount};
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = SetSaleIntentionArgs;
pub type Response = SetSaleIntentionResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct SetSaleIntentionArgs {
    pub receiver_account: LedgerAccount,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum SetSaleIntentionResponse {
    Ok(SetSaleIntentionResult),
    Err(SetSaleIntentionError),
}

pub type SetSaleIntentionResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum SetSaleIntentionError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
    InvalidAccountIdentifier,
    CertificateExpirationImminent,
}

impl From<Result<SetSaleIntentionResult, SetSaleIntentionError>> for SetSaleIntentionResponse {
    fn from(result: Result<SetSaleIntentionResult, SetSaleIntentionError>) -> Self {
        match result {
            Ok(ok) => SetSaleIntentionResponse::Ok(ok),
            Err(err) => SetSaleIntentionResponse::Err(err),
        }
    }
}
