use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = DeleteHolderAuthnMethodArgs;
pub type Response = DeleteHolderAuthnMethodResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct DeleteHolderAuthnMethodArgs {}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum DeleteHolderAuthnMethodResponse {
    Ok(DeleteHolderAuthnMethodResult),
    Err(DeleteHolderAuthnMethodError),
}

pub type DeleteHolderAuthnMethodResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum DeleteHolderAuthnMethodError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl From<Result<DeleteHolderAuthnMethodResult, DeleteHolderAuthnMethodError>>
    for DeleteHolderAuthnMethodResponse
{
    fn from(result: Result<DeleteHolderAuthnMethodResult, DeleteHolderAuthnMethodError>) -> Self {
        match result {
            Ok(ok) => DeleteHolderAuthnMethodResponse::Ok(ok),
            Err(err) => DeleteHolderAuthnMethodResponse::Err(err),
        }
    }
}
