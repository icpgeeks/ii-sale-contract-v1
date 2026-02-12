use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = ReceiveDelegationArgs;
pub type Response = ReceiveDelegationResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct ReceiveDelegationArgs {
    pub get_delegation_response: Vec<u8>,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum ReceiveDelegationResponse {
    Ok(ReceiveDelegationResult),
    Err(ReceiveDelegationError),
}

pub type ReceiveDelegationResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum ReceiveDelegationError {
    HolderWrongState,
    ResponseNotContainsDelegation,
    DelegationWrong { reason: String },
    HolderLocked { lock: DelayedTimestampMillis },
}

impl From<Result<ReceiveDelegationResult, ReceiveDelegationError>> for ReceiveDelegationResponse {
    fn from(result: Result<ReceiveDelegationResult, ReceiveDelegationError>) -> Self {
        match result {
            Ok(ok) => ReceiveDelegationResponse::Ok(ok),
            Err(err) => ReceiveDelegationResponse::Err(err),
        }
    }
}
