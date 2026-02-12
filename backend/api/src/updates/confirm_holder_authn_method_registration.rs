use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = ConfirmHolderAuthnMethodRegistrationArgs;
pub type Response = ConfirmHolderAuthnMethodRegistrationResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct ConfirmHolderAuthnMethodRegistrationArgs {
    pub frontend_hostname: String,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum ConfirmHolderAuthnMethodRegistrationResponse {
    Ok(ConfirmHolderAuthnMethodRegistrationResult),
    Err(ConfirmHolderAuthnMethodRegistrationError),
}

pub type ConfirmHolderAuthnMethodRegistrationResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum ConfirmHolderAuthnMethodRegistrationError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl
    From<
        Result<
            ConfirmHolderAuthnMethodRegistrationResult,
            ConfirmHolderAuthnMethodRegistrationError,
        >,
    > for ConfirmHolderAuthnMethodRegistrationResponse
{
    fn from(
        result: Result<
            ConfirmHolderAuthnMethodRegistrationResult,
            ConfirmHolderAuthnMethodRegistrationError,
        >,
    ) -> Self {
        match result {
            Ok(ok) => ConfirmHolderAuthnMethodRegistrationResponse::Ok(ok),
            Err(err) => ConfirmHolderAuthnMethodRegistrationResponse::Err(err),
        }
    }
}
