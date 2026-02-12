use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = ProtectedAuthnMethodDeletedArgs;
pub type Response = ProtectedAuthnMethodDeletedResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct ProtectedAuthnMethodDeletedArgs {}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum ProtectedAuthnMethodDeletedResponse {
    Ok(ProtectedAuthnMethodDeletedResult),
    Err(ProtectedAuthnMethodDeletedError),
}

pub type ProtectedAuthnMethodDeletedResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum ProtectedAuthnMethodDeletedError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl From<Result<ProtectedAuthnMethodDeletedResult, ProtectedAuthnMethodDeletedError>>
    for ProtectedAuthnMethodDeletedResponse
{
    fn from(
        result: Result<ProtectedAuthnMethodDeletedResult, ProtectedAuthnMethodDeletedError>,
    ) -> Self {
        match result {
            Ok(ok) => ProtectedAuthnMethodDeletedResponse::Ok(ok),
            Err(err) => ProtectedAuthnMethodDeletedResponse::Err(err),
        }
    }
}
