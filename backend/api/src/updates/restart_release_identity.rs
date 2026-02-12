use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = RestartReleaseIdentityArgs;
pub type Response = RestartReleaseIdentityResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct RestartReleaseIdentityArgs {
    pub registration_id: Option<String>,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum RestartReleaseIdentityResponse {
    Ok(RestartReleaseIdentityResult),
    Err(RestartReleaseIdentityError),
}

pub type RestartReleaseIdentityResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum RestartReleaseIdentityError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl From<Result<RestartReleaseIdentityResult, RestartReleaseIdentityError>>
    for RestartReleaseIdentityResponse
{
    fn from(result: Result<RestartReleaseIdentityResult, RestartReleaseIdentityError>) -> Self {
        match result {
            Ok(ok) => RestartReleaseIdentityResponse::Ok(ok),
            Err(err) => RestartReleaseIdentityResponse::Err(err),
        }
    }
}
