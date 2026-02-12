use candid::CandidType;
use common_canister_types::{ChunkDef, SortingDefinition, TimestampMillis};
use serde::Deserialize;

use crate::types::holder::HolderProcessingEvent;

pub type Args = GetHolderEventsArgs;
pub type Response = GeHolderEventsResponse;

#[derive(CandidType, Deserialize, Debug)]
pub enum IdentityEventsSortingKey {
    Created,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct GetHolderEventsArgs {
    pub chunk_def: ChunkDef,
    pub sorting: Option<SortingDefinition<IdentityEventsSortingKey>>,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum GeHolderEventsResponse {
    Ok(GetHolderEventsResult),
}

#[derive(CandidType, Deserialize, Debug)]
pub struct GetHolderEventsResult {
    pub events: Vec<IdentifiedHolderProcessingEvent>,
    pub total_count: usize,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct IdentifiedHolderProcessingEvent {
    pub id: usize,
    pub time: TimestampMillis,
    pub event: HolderProcessingEvent,
}
