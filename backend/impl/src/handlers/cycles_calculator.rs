use contract_canister_api::types::holder::CanisterCyclesState;

use crate::{components::Environment, read_state};

pub(crate) struct CyclesCalculator {
    state: CanisterCyclesState,
}

impl CyclesCalculator {
    pub fn new(env: &Environment, initial_cycles: u128) -> Self {
        Self {
            state: CanisterCyclesState {
                initial_cycles,
                warning_threshold_cycles: get_cycles_threshold(
                    initial_cycles,
                    env.get_settings().warning_cycles_threshold_percentage,
                ),
                critical_threshold_cycles: get_cycles_threshold(
                    initial_cycles,
                    env.get_settings().critical_cycles_threshold_percentage,
                ),
                current_cycles: env.get_ic().get_canister_metrics().cycles,
            },
        }
    }

    pub(crate) fn get_cycles_state(&self) -> &CanisterCyclesState {
        &self.state
    }

    pub(crate) fn is_critical_cycles_level(&self) -> bool {
        self.state.current_cycles <= self.state.critical_threshold_cycles
    }
}

fn get_cycles_threshold(cycles: u128, cycles_threshold_percentage: u8) -> u128 {
    (cycles / 100)
        .checked_mul(cycles_threshold_percentage as u128)
        .unwrap_or(cycles)
}

pub(crate) fn get_cycles_calculator() -> CyclesCalculator {
    read_state(|state| {
        CyclesCalculator::new(
            state.get_env().as_ref(),
            state
                .get_model()
                .get_holder()
                .get_holder_model()
                .initial_cycles,
        )
    })
}
