use candid::CandidType;
use common_canister_types::DelayedTimestampMillis;
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = CancelBuyerOfferArgs;
pub type Response = CancelBuyerOfferResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct CancelBuyerOfferArgs {}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum CancelBuyerOfferResponse {
    Ok(CancelBuyerOfferResult),
    Err(CancelBuyerOfferError),
}

pub type CancelBuyerOfferResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum CancelBuyerOfferError {
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
    NoBuyerOffer,
}

impl From<Result<CancelBuyerOfferResult, CancelBuyerOfferError>> for CancelBuyerOfferResponse {
    fn from(result: Result<CancelBuyerOfferResult, CancelBuyerOfferError>) -> Self {
        match result {
            Ok(ok) => CancelBuyerOfferResponse::Ok(ok),
            Err(err) => CancelBuyerOfferResponse::Err(err),
        }
    }
}
