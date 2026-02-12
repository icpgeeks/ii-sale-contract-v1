use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = CancelSaleIntentionArgs;
pub type Response = CancelSaleIntentionResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct CancelSaleIntentionArgs {}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum CancelSaleIntentionResponse {
    Ok(CancelSaleIntentionResult),
    Err(CancelSaleIntentionError),
}

pub type CancelSaleIntentionResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum CancelSaleIntentionError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl From<Result<CancelSaleIntentionResult, CancelSaleIntentionError>>
    for CancelSaleIntentionResponse
{
    fn from(result: Result<CancelSaleIntentionResult, CancelSaleIntentionError>) -> Self {
        match result {
            Ok(ok) => CancelSaleIntentionResponse::Ok(ok),
            Err(err) => CancelSaleIntentionResponse::Err(err),
        }
    }
}
