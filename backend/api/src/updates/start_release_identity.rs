use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = StartReleaseIdentityArgs;
pub type Response = StartReleaseIdentityResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct StartReleaseIdentityArgs {}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum StartReleaseIdentityResponse {
    Ok(StartReleaseIdentityResult),
    Err(StartReleaseIdentityError),
}

pub type StartReleaseIdentityResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum StartReleaseIdentityError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl From<Result<StartReleaseIdentityResult, StartReleaseIdentityError>>
    for StartReleaseIdentityResponse
{
    fn from(result: Result<StartReleaseIdentityResult, StartReleaseIdentityError>) -> Self {
        match result {
            Ok(ok) => StartReleaseIdentityResponse::Ok(ok),
            Err(err) => StartReleaseIdentityResponse::Err(err),
        }
    }
}
