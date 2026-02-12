use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = CancelCaptureIdentityArgs;
pub type Response = CancelCaptureIdentityResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct CancelCaptureIdentityArgs {}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum CancelCaptureIdentityResponse {
    Ok(CancelCaptureIdentityResult),
    Err(CancelCaptureIdentityError),
}

pub type CancelCaptureIdentityResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum CancelCaptureIdentityError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl From<Result<CancelCaptureIdentityResult, CancelCaptureIdentityError>>
    for CancelCaptureIdentityResponse
{
    fn from(result: Result<CancelCaptureIdentityResult, CancelCaptureIdentityError>) -> Self {
        match result {
            Ok(ok) => CancelCaptureIdentityResponse::Ok(ok),
            Err(err) => CancelCaptureIdentityResponse::Err(err),
        }
    }
}
