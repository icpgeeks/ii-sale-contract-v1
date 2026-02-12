use crate::{
    handlers::holder::processor::verify_processing_health,
    queries::holder::get_holder_information_query::get_holder_information_query,
};
use contract_canister_api::get_holder_information::*;
use ic_cdk_macros::update;

#[update]
fn get_holder_information(args: Args) -> Response {
    verify_processing_health();

    get_holder_information_query(args)
}
