use candid::CandidType;
use common_canister_types::{DelayedTimestampMillis, LedgerAccount, TokenE8s};
use serde::Deserialize;

use crate::types::holder::CheckApprovedBalanceError;

use super::process_holder::ProcessHolderResult;

pub type Args = SetBuyerOfferArgs;
pub type Response = SetBuyerOfferResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct SetBuyerOfferArgs {
    pub approved_account: LedgerAccount,
    pub referral: Option<String>,
    pub offer_amount: TokenE8s,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum SetBuyerOfferResponse {
    Ok(SetBuyerOfferResult),
    Err(SetBuyerOfferError),
}

pub type SetBuyerOfferResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum SetBuyerOfferError {
    InvalidReferral,
    OfferAmountTooLow {
        min_sell_price_inclusively: TokenE8s,
    },
    OfferAmountExceedsPrice,
    CheckApprovedBalanceError {
        error: CheckApprovedBalanceError,
    },
    HolderWrongState,
    HolderLocked {
        lock: DelayedTimestampMillis,
    },
}

impl From<Result<SetBuyerOfferResult, SetBuyerOfferError>> for SetBuyerOfferResponse {
    fn from(result: Result<SetBuyerOfferResult, SetBuyerOfferError>) -> Self {
        match result {
            Ok(ok) => SetBuyerOfferResponse::Ok(ok),
            Err(err) => SetBuyerOfferResponse::Err(err),
        }
    }
}
