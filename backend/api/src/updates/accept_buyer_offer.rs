use candid::{CandidType, Principal};
use common_canister_types::{DelayedTimestampMillis, TokenE8s};
use serde::Deserialize;

use crate::types::holder::CheckApprovedBalanceError;

use super::process_holder::ProcessHolderResult;

pub type Args = AcceptBuyerOfferArgs;
pub type Response = AcceptBuyerOfferResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct AcceptBuyerOfferArgs {
    pub buyer: Principal,
    pub offer_amount: TokenE8s,
    pub check_higher_offer: bool,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum AcceptBuyerOfferResponse {
    Ok(AcceptBuyerOfferResult),
    Err(AcceptBuyerOfferError),
}

pub type AcceptBuyerOfferResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum AcceptBuyerOfferError {
    PermissionDenied,
    OfferNotFound,
    OfferMismatch,
    HigherBuyerOfferExists,
    CriticalCyclesLevel { critical_threshold_cycles: u128 },
    CheckApprovedBalanceError { error: CheckApprovedBalanceError },
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
    OfferRemoved,
}

impl From<Result<AcceptBuyerOfferResult, AcceptBuyerOfferError>> for AcceptBuyerOfferResponse {
    fn from(result: Result<AcceptBuyerOfferResult, AcceptBuyerOfferError>) -> Self {
        match result {
            Ok(ok) => AcceptBuyerOfferResponse::Ok(ok),
            Err(err) => AcceptBuyerOfferResponse::Err(err),
        }
    }
}
