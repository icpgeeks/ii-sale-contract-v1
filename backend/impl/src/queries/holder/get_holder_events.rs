use crate::read_state;
use common_canister_types::SortingOrder;
use contract_canister_api::get_holder_events::*;
use ic_cdk_macros::query;

#[query]
fn get_holder_events(Args { chunk_def, sorting }: Args) -> Response {
    let start = chunk_def.start;
    let count = chunk_def.count;
    let descending = sorting.is_none_or(|s| s.order == SortingOrder::Descending);

    read_state(|state| {
        let model = state.get_model();

        let total_count = model.get_holder().get_events_len() as usize;
        let mut events = Vec::with_capacity(count);

        for index in start..(start + count) {
            let index = if descending {
                total_count - index - 1
            } else {
                index
            };

            match model.get_holder().get_event(index as u64) {
                Some(event) => events.push(IdentifiedHolderProcessingEvent {
                    id: index,
                    time: event.timestamp,
                    event: event.value.clone(),
                }),
                None => break,
            }
        }

        Response::Ok(GetHolderEventsResult {
            total_count,
            events,
        })
    })
}
