use crate::guards::contract_is_activated;
use contract_canister_api::process_holder::*;
use ic_cdk_macros::update;

use crate::handlers::holder::{build_holder_information_with_load, processor};

#[update(guard = "contract_is_activated")]
async fn process_holder(_args: Args) -> Response {
    processor::process_holder_with_lock().await;

    Response::Ok(ProcessHolderResult {
        holder_information: build_holder_information_with_load(),
    })
}
