use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = ConfirmOwnerAuthnMethodRegistrationArgs;
pub type Response = ConfirmOwnerAuthnMethodRegistrationResponse;

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct ConfirmOwnerAuthnMethodRegistrationArgs {
    pub verification_code: String,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum ConfirmOwnerAuthnMethodRegistrationResponse {
    Ok(ConfirmOwnerAuthnMethodRegistrationResult),
    Err(ConfirmOwnerAuthnMethodRegistrationError),
}

pub type ConfirmOwnerAuthnMethodRegistrationResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum ConfirmOwnerAuthnMethodRegistrationError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl
    From<
        Result<ConfirmOwnerAuthnMethodRegistrationResult, ConfirmOwnerAuthnMethodRegistrationError>,
    > for ConfirmOwnerAuthnMethodRegistrationResponse
{
    fn from(
        result: Result<
            ConfirmOwnerAuthnMethodRegistrationResult,
            ConfirmOwnerAuthnMethodRegistrationError,
        >,
    ) -> Self {
        match result {
            Ok(ok) => ConfirmOwnerAuthnMethodRegistrationResponse::Ok(ok),
            Err(err) => ConfirmOwnerAuthnMethodRegistrationResponse::Err(err),
        }
    }
}
