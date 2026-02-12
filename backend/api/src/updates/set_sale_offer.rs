use candid::CandidType;
use common_canister_types::{DelayedTimestampMillis, TokenE8s};
use serde::Deserialize;

use super::process_holder::ProcessHolderResult;

pub type Args = SetSaleOfferArgs;
pub type Response = SetSaleOfferResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct SetSaleOfferArgs {
    pub price: TokenE8s,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum SetSaleOfferResponse {
    Ok(SetSaleOfferResult),
    Err(SetSaleOfferError),
}

pub type SetSaleOfferResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum SetSaleOfferError {
    PermissionDenied,
    HolderWrongState,
    HolderLocked {
        lock: DelayedTimestampMillis,
    },
    PriceTooLow {
        min_sell_price_inclusively: TokenE8s,
    },
    HigherBuyerOfferExists,
}

impl From<Result<SetSaleOfferResult, SetSaleOfferError>> for SetSaleOfferResponse {
    fn from(result: Result<SetSaleOfferResult, SetSaleOfferError>) -> Self {
        match result {
            Ok(ok) => SetSaleOfferResponse::Ok(ok),
            Err(err) => SetSaleOfferResponse::Err(err),
        }
    }
}
