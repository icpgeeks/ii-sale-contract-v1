use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = StartCaptureIdentityArgs;
pub type Response = StartCaptureIdentityResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct StartCaptureIdentityArgs {
    pub identity_number: u64,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum StartCaptureIdentityResponse {
    Ok(StartCaptureIdentityResult),
    Err(StartCaptureIdentityError),
}

pub type StartCaptureIdentityResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum StartCaptureIdentityError {
    PermissionDenied,
    CertificateExpirationImminent,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl From<Result<StartCaptureIdentityResult, StartCaptureIdentityError>>
    for StartCaptureIdentityResponse
{
    fn from(result: Result<StartCaptureIdentityResult, StartCaptureIdentityError>) -> Self {
        match result {
            Ok(ok) => StartCaptureIdentityResponse::Ok(ok),
            Err(err) => StartCaptureIdentityResponse::Err(err),
        }
    }
}
