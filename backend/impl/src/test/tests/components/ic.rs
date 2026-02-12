use std::cell::RefCell;

use candid::Principal;
use common_canister_impl::components::ic::{is_principal_anonymous, Ic};
use common_canister_types::CanisterMetrics;

pub(crate) const TEST_CANISTER_CYCLES: u128 = 1_000_000;

thread_local! {
    static __TEST_CALLER: RefCell<Option<Principal>> = RefCell::default();
}

thread_local! {
    static __TEST_CYCLES: RefCell<Option<u128>> = RefCell::default();
}

pub fn set_test_caller(principal: Principal) {
    __TEST_CALLER.with(|caller| {
        *caller.borrow_mut() = Some(principal);
    });
}

pub fn ht_set_test_cycles(values: u128) {
    __TEST_CYCLES.with(|cycles| {
        *cycles.borrow_mut() = Some(values);
    });
}

pub struct IcTest {
    pub root_public_key_raw: Vec<u8>,
    pub canister: Principal,
}

impl Ic for IcTest {
    fn get_root_public_key_raw(&self) -> &[u8] {
        &self.root_public_key_raw
    }

    fn get_canister(&self) -> Principal {
        self.canister
    }

    fn get_canister_metrics(&self) -> common_canister_types::CanisterMetrics {
        let cycles = __TEST_CYCLES
            .with(|cycles| *cycles.borrow())
            .unwrap_or(TEST_CANISTER_CYCLES);

        CanisterMetrics {
            stable_memory_size: 1,
            heap_memory_size: 2,
            cycles,
        }
    }

    fn get_caller(&self) -> Principal {
        __TEST_CALLER.with(|caller| caller.borrow().clone().unwrap_or(Principal::anonymous()))
    }

    fn is_caller_anonymous(&self) -> bool {
        is_principal_anonymous(&self.get_caller())
    }

    fn set_certified_data(&self, _data: &[u8]) {}

    fn get_cost_create_canister(&self) -> u128 {
        1_000
    }
}
