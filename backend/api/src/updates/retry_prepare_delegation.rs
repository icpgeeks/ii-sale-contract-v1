use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = RetryPrepareDelegationArgs;
pub type Response = RetryPrepareDelegationResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct RetryPrepareDelegationArgs {}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum RetryPrepareDelegationResponse {
    Ok(RetryPrepareDelegationResult),
    Err(RetryPrepareDelegationError),
}

pub type RetryPrepareDelegationResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum RetryPrepareDelegationError {
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl From<Result<RetryPrepareDelegationResult, RetryPrepareDelegationError>>
    for RetryPrepareDelegationResponse
{
    fn from(result: Result<RetryPrepareDelegationResult, RetryPrepareDelegationError>) -> Self {
        match result {
            Ok(ok) => RetryPrepareDelegationResponse::Ok(ok),
            Err(err) => RetryPrepareDelegationResponse::Err(err),
        }
    }
}
