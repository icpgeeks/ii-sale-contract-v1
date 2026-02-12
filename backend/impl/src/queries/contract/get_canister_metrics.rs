use common_canister_api::get_canister_metrics::*;
use ic_cdk_macros::query;

use crate::get_env;

#[query]
fn get_canister_metrics(_args: Args) -> Response {
    Response::Ok(GetCanisterMetricsResult {
        metrics: get_env().get_ic().get_canister_metrics(),
    })
}
