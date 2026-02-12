use std::{cell::RefCell, future::Future, pin::Pin};

use async_trait::async_trait;
use candid::Principal;
use common_canister_impl::{components::ic_agent::IcAgent, handlers::ic_agent::IcAgentRequest};
use ic_cdk::call::{CallPerformFailed, CallResult, Error};

thread_local! {
    static __IC_AGENT_RESPONSE: RefCell<Option<Vec<u8>>> = RefCell::default();
}

pub fn set_test_ic_agent_response(response: Vec<u8>) {
    __IC_AGENT_RESPONSE.with(|agent_response| {
        *agent_response.borrow_mut() = Some(response);
    });
}

pub struct IcAgentTest {}

#[async_trait(?Send)]
impl IcAgent for IcAgentTest {
    async fn execute_ic_agent_request(
        &self,
        _ic_url: String,
        _sleeper: Box<dyn Fn() -> Pin<Box<dyn Future<Output = ()>>>>,
        _request: IcAgentRequest,
        _transform_canister_id: Principal,
        _transform_query_method: String,
    ) -> CallResult<Vec<u8>> {
        __IC_AGENT_RESPONSE
            .with(|agent_response| agent_response.borrow().clone())
            .ok_or(Error::CallPerformFailed(CallPerformFailed {}))
    }
}
