use candid::CandidType;
use common_canister_types::{DelayedTimestampMillis, LedgerAccount, TokenE8s};
use serde::Deserialize;

use crate::types::holder::CheckApprovedBalanceError;

use super::process_holder::ProcessHolderResult;

pub type Args = AcceptSellerOfferArgs;
pub type Response = AcceptSellerOfferResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct AcceptSellerOfferArgs {
    pub approved_account: LedgerAccount,
    pub referral: Option<String>,
    pub price: TokenE8s,
}

#[derive(CandidType, Deserialize, Debug)]
#[allow(clippy::large_enum_variant)]
pub enum AcceptSellerOfferResponse {
    Ok(AcceptSellerOfferResult),
    Err(AcceptSellerOfferError),
}

pub type AcceptSellerOfferResult = ProcessHolderResult;

#[derive(CandidType, Deserialize, Debug)]
pub enum AcceptSellerOfferError {
    InvalidReferral,
    PriceMismatch,
    CriticalCyclesLevel { critical_threshold_cycles: u128 },
    CheckApprovedBalanceError { error: CheckApprovedBalanceError },
    HolderWrongState,
    HolderLocked { lock: DelayedTimestampMillis },
}

impl From<Result<AcceptSellerOfferResult, AcceptSellerOfferError>> for AcceptSellerOfferResponse {
    fn from(result: Result<AcceptSellerOfferResult, AcceptSellerOfferError>) -> Self {
        match result {
            Ok(ok) => AcceptSellerOfferResponse::Ok(ok),
            Err(err) => AcceptSellerOfferResponse::Err(err),
        }
    }
}
