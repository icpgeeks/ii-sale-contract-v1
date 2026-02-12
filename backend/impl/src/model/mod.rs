use common_canister_impl::stable_structures::CBor;
use common_canister_types::TimestampMillis;
use common_contract_api::init_contract::InitContractArgs;
use contract_canister_api::types::holder::HolderState;
use holder::IdentityHolder;
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl, RestrictedMemory, StableCell, MAX_PAGES,
};

pub mod holder;

type RM = RestrictedMemory<DefaultMemoryImpl>;

pub struct ContractModel {
    init_contract_args: StableCell<CBor<InitContractArgs>, RM>,
    identity_holder: IdentityHolder,
}

impl ContractModel {
    pub(crate) fn init(
        init_args: InitContractArgs,
        time: TimestampMillis,
        initial_cycles: u128,
    ) -> Self {
        let init_args_memory = RM::new(DefaultMemoryImpl::default(), 0..1);
        let holder_model_mem = RM::new(DefaultMemoryImpl::default(), 1..10);
        let mm = MemoryManager::init(RM::new(DefaultMemoryImpl::default(), 10..MAX_PAGES));

        let events_log_index_memory = mm.get(MemoryId::new(0));
        let events_log_data_memory = mm.get(MemoryId::new(1));

        Self {
            init_contract_args: StableCell::init(init_args_memory, CBor(init_args)),
            identity_holder: IdentityHolder::init(
                time,
                initial_cycles,
                holder_model_mem,
                events_log_index_memory,
                events_log_data_memory,
            ),
        }
    }

    pub(crate) fn get_init_contract_args(&self) -> &InitContractArgs {
        self.init_contract_args.get()
    }

    pub(crate) fn is_contract_activated(&self) -> bool {
        !matches!(
            self.identity_holder.get_holder_model().state.value,
            HolderState::WaitingActivation
        )
    }

    pub(crate) fn get_holder(&self) -> &IdentityHolder {
        &self.identity_holder
    }

    pub(crate) fn get_holder_mut(&mut self) -> &mut IdentityHolder {
        &mut self.identity_holder
    }
}
