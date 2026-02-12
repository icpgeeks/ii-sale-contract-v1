use crate::handlers::holder::build_holder_information_with_load;
use contract_canister_api::get_holder_information_query::*;
use ic_cdk_macros::query;

#[query]
pub(crate) fn get_holder_information_query(_args: Args) -> Response {
    Response::Ok(GetHolderInformationResult {
        holder_information: build_holder_information_with_load(),
    })
}
