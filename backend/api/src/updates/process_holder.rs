use candid::CandidType;
use serde::Deserialize;

use crate::types::holder::HolderInformation;

pub type Args = ProcessHolderArgs;
pub type Response = ProcessHolderResponse;

#[derive(CandidType, Deserialize, Debug)]
pub struct ProcessHolderArgs {}

#[derive(CandidType, Deserialize, Debug)]
pub enum ProcessHolderResponse {
    Ok(ProcessHolderResult),
}

#[derive(CandidType, Deserialize, Debug)]
pub struct ProcessHolderResult {
    pub holder_information: HolderInformation,
}
