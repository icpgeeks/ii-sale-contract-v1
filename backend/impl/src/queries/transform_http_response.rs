use common_canister_impl::{
    handlers::ic_agent::{
        executor::{
            call::{get_certificate_from_state_response_body, lookup_request_status},
            query::get_reply_from_query_response_body,
        },
        verify::verify_state_response_certificate,
        TransformerCtx,
    },
    serializer::serialize,
};
use contract_canister_api::transform_http_response::*;

use crate::{get_env, log_debug};

#[ic_cdk::query]
fn transform_http_response(args: Args) -> Response {
    let env = get_env();

    let ctx: TransformerCtx =
        serde_cbor::from_slice(args.context.as_slice()).expect("wrong transform ctx");

    let mut response = args.response;
    response.headers = vec![];

    match ctx {
        TransformerCtx::Call => {}
        TransformerCtx::Query => match get_reply_from_query_response_body(&response.body) {
            Ok(data) => response.body = data,
            Err(error) => {
                log_debug!(get_env(), "Failed to parse query response: {error:?}");
                response.body.clear();
            }
        },
        TransformerCtx::CallStatus {
            effective_canister_id,
            request_id,
        } => {
            if let Ok(cert) = get_certificate_from_state_response_body(&response.body) {
                if let Ok(()) = verify_state_response_certificate(
                    &cert,
                    effective_canister_id,
                    env.get_ic().get_root_public_key_raw().to_vec(),
                ) {
                    match serialize(lookup_request_status(cert, &request_id)) {
                        Ok(content) => {
                            response.body = content;
                        }
                        Err(error) => {
                            log_debug!(get_env(), "Failed to extract reply from call status response certificate: {:?}, error: {error:?}",
                                    get_certificate_from_state_response_body(&response.body));
                            response.body.clear();
                        }
                    }
                } else {
                    log_debug!(
                        get_env(),
                        "Failed to verify certificate from call status response"
                    );
                    response.body.clear();
                }
            } else {
                log_debug!(
                    get_env(),
                    "Failed to extract certificate from state response body"
                );
                response.body.clear();
            }
        }
    }
    response
}
