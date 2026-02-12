use candid::CandidType;
use serde::Deserialize;

use crate::types::holder::HolderInformation;

pub type Args = GetHolderInformationArgs;
pub type Response = GetHolderInformationResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct GetHolderInformationArgs {}

#[derive(CandidType, Deserialize, Debug)]
pub enum GetHolderInformationResponse {
    Ok(GetHolderInformationResult),
}

#[derive(CandidType, Deserialize, Debug)]
pub struct GetHolderInformationResult {
    pub holder_information: HolderInformation,
}
