use std::ops::Deref;

use candid::Principal;
use common_canister_impl::{
    components::time::Time,
    handlers::ic_request::{
        builder::RequestSender,
        public_key::uncompressed_public_key_to_asn1_block,
        types::{Delegation, SignedDelegation},
    },
    stable_structures::CBor,
};
use common_canister_types::{
    Asn1BlockPublicKey, DerivationPath, TimestampMillis, Timestamped, TokenE8s,
    UncompressedPublicKey,
};
use contract_canister_api::types::holder::{
    CaptureState, CompletedSaleDeal, DelegationData, HolderAssets, HolderProcessingError,
    HolderProcessingEvent::{self, *},
    HolderState, NeuronAsset, NeuronInformation, NnsHolderAssets, SaleDeal,
};
use events::{
    capture::handle_capture_event, holding::handle_holding_event, release::handle_releasing_event,
};
use ic_cdk_timers::TimerId;
use ic_stable_structures::{
    memory_manager::VirtualMemory, DefaultMemoryImpl, RestrictedMemory, StableCell, StableLog,
};
use secp256k1::PublicKey;
use serde::{Deserialize, Serialize};

pub mod events;

type VM = VirtualMemory<RestrictedMemory<DefaultMemoryImpl>>;
type RM = RestrictedMemory<DefaultMemoryImpl>;

pub struct IdentityHolder {
    model: StableCell<CBor<HolderModel>, RM>,
    events: StableLog<CBor<Timestamped<HolderProcessingEvent>>, VM, VM>,
    lock: LockModel,
    timer: Option<ProcessingTimer>,
}

impl IdentityHolder {
    pub(crate) fn init(
        time: TimestampMillis,
        initial_cycles: u128,
        model_memory: RM,
        events_log_index_memory: VM,
        events_log_data_memory: VM,
    ) -> Self {
        Self {
            model: StableCell::init(model_memory, CBor(HolderModel::new(time, initial_cycles))),
            events: StableLog::init(events_log_index_memory, events_log_data_memory),
            lock: LockModel::default(),
            timer: None,
        }
    }
}

// Holder get information

impl IdentityHolder {
    pub(crate) fn get_holder_model(&self) -> &HolderModel {
        self.model.get()
    }

    pub(crate) fn get_events_len(&self) -> u64 {
        self.events.len()
    }

    pub(crate) fn get_event(&self, idx: u64) -> Option<CBor<Timestamped<HolderProcessingEvent>>> {
        self.events.get(idx)
    }
}

#[derive(Debug)]
pub enum UpdateHolderError {
    WrongState,
    HolderIsLocked { expiration: TimestampMillis },
}

#[macro_export]
macro_rules! state_matches {
    ($expression:expr, $pattern:pat $(if $guard:expr)? $(,)?) => {
        match $expression.state.value {
            $pattern $(if $guard)? => {},
            _ => { return Err(UpdateHolderError::WrongState); }
        }
    };
}

impl IdentityHolder {
    pub(crate) fn update_holder(
        &mut self,
        time: TimestampMillis,
        lock: &HolderLock,
        event: HolderProcessingEvent,
    ) -> Result<(), UpdateHolderError> {
        self.update_identity_holder_in_table(lock, |_, model| -> Result<(), UpdateHolderError> {
            model.processing_error = None;

            match &event {
                ContractActivated { owner } => {
                    state_matches!(model, HolderState::WaitingActivation);

                    model.owner = Some(Timestamped::new(time, *owner));
                    model.state = Timestamped::new(time, HolderState::WaitingStartCapture);
                }
                StartCaptureIdentity { identity_number } => {
                    state_matches!(model, HolderState::WaitingStartCapture);

                    model.identity_number = Some(*identity_number);
                    model.state = Timestamped::new(
                        time,
                        HolderState::Capture {
                            sub_state: CaptureState::StartCapture,
                        },
                    );
                }
                Capturing { event } => handle_capture_event(model, time, event)?,
                Holding { event } => handle_holding_event(model, time, event)?,
                Releasing { event } => handle_releasing_event(model, time, event)?,
                DelayAddContractController {
                    time: delay_to_time,
                } => {
                    model.upgrade_contract_state = Timestamped::new(
                        time,
                        UpgradeContractState::WaitingAddControllerDelay {
                            time: *delay_to_time,
                        },
                    );
                }
                AllowAddContractController => {
                    model.upgrade_contract_state =
                        Timestamped::new(time, UpgradeContractState::AllowAddController);
                }
                ProcessingError { error } => {
                    model.processing_error = Some(Timestamped::new(time, error.clone()));
                }
            }
            Ok(())
        })?;

        // ADD EVENT

        // Prevent consecutive ProcessingError events
        if let ProcessingError { .. } = &event {
            let len = self.events.len();
            if len > 0
                && matches!(
                    &self.events.get(len - 1).unwrap().value,
                    ProcessingError { .. }
                )
            {
                return Ok(());
            }
        }

        let event = CBor(Timestamped::new(time, event));
        if let Err(error) = self.events.append(&event) {
            ic_cdk::println!(
                "Holder model: event append error {:?}, reason: {error:?}",
                *event
            );
        }

        Ok(())
    }

    fn update_identity_holder_in_table<F, V>(
        &mut self,
        lock: &HolderLock,
        updater: F,
    ) -> Result<V, UpdateHolderError>
    where
        F: Fn(&mut Self, &mut HolderModel) -> Result<V, UpdateHolderError>,
    {
        let current_lock = self.lock.current.as_ref().unwrap();
        if lock != current_lock {
            return Err(UpdateHolderError::HolderIsLocked {
                expiration: current_lock.expiration,
            });
        }

        let mut model = self.model.get().deref().clone();

        let result = updater(self, &mut model);

        if result.is_ok() {
            self.model.set(CBor(model));
        }

        result
    }
}

// HOLDER LOCK MANAGEMENT

#[derive(Default)]
pub struct LockModel {
    sequence: u64,
    current: Option<HolderLock>,
}

#[derive(Clone, PartialEq, Eq, Debug)]
pub struct HolderLock {
    pub lock_id: u64,
    pub expiration: TimestampMillis,
}

impl IdentityHolder {
    /// Locks the holder.
    /// Returns an error if the holder is already locked by another lock.
    pub(crate) fn lock_holder(
        &mut self,
        time: &dyn Time,
        delay: &TimestampMillis,
    ) -> Result<HolderLock, TimestampMillis> {
        let now = time.get_current_unix_epoch_time_millis();

        if let Some(lock) = self.lock.current.as_ref() {
            if now < lock.expiration {
                return Err(lock.expiration);
            }
        }

        let lock = HolderLock {
            lock_id: self.lock.sequence,
            expiration: now + delay,
        };
        self.lock.sequence += 1;
        self.lock.current = Some(lock.clone());
        Ok(lock)
    }

    /// Unlocks the holder.
    /// Returns `false` if the holder is not locked or locked by another lock.
    pub(crate) fn unlock_holder(&mut self, lock: &HolderLock) -> bool {
        if self.lock.current.as_ref().unwrap() == lock {
            self.lock.current = None;
            true
        } else {
            false
        }
    }
}

// PROCESSING TIMER SUPPORT

#[derive(Debug)]
pub enum ProcessingTimerType {
    HandleLockExpiration,
    RetryOperation,
    ContinueProcessing,
    ScheduleProcessing,
}

#[derive(Debug)]
pub struct ProcessingTimer {
    pub timer_type: ProcessingTimerType,
    pub scheduled_time: TimestampMillis,
    pub timer_id: TimerId,
}

impl IdentityHolder {
    pub(crate) fn get_processing_timer(&self) -> Option<&ProcessingTimer> {
        self.timer.as_ref()
    }

    pub(crate) fn set_processing_timer(&mut self, timer: Option<ProcessingTimer>) {
        self.timer = timer;
    }
}

// HOLDER MODEL

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HolderModel {
    pub initial_cycles: u128,
    pub owner: Option<Timestamped<Principal>>,
    pub state: Timestamped<HolderState>,
    pub ecdsa_key: Option<Vec<u8>>,
    pub identity_number: Option<u64>,
    pub identity_name: Option<String>,
    pub holding_timestamp: Option<TimestampMillis>,
    pub delegation_data: Option<DelegationData>,
    pub fetching_assets: Option<HolderAssets>,
    pub fetching_nns_assets: Option<NnsHolderAssets>,
    pub assets: Option<Timestamped<HolderAssets>>,
    pub sale_deal: Option<SaleDeal>,
    pub completed_sale_deal: Option<CompletedSaleDeal>,
    pub processing_error: Option<Timestamped<HolderProcessingError>>,
    pub upgrade_contract_state: Timestamped<UpgradeContractState>,
}

impl HolderModel {
    fn new(time: TimestampMillis, initial_cycles: u128) -> Self {
        Self {
            initial_cycles,
            owner: None,
            state: Timestamped::new(time, HolderState::WaitingActivation),
            ecdsa_key: None,
            identity_number: None,
            identity_name: None,
            holding_timestamp: None,
            delegation_data: None,
            fetching_assets: None,
            fetching_nns_assets: None,
            assets: None,
            sale_deal: None,
            completed_sale_deal: None,
            processing_error: None,
            upgrade_contract_state: Timestamped::new(
                time,
                UpgradeContractState::WaitingCertificateExpiration,
            ),
        }
    }

    pub(crate) fn reset_to_new_capture(&mut self, time: TimestampMillis) {
        self.state = Timestamped::new(time, HolderState::WaitingStartCapture);
        self.ecdsa_key = None;
        self.identity_number = None;
        self.identity_name = None;
        self.holding_timestamp = None;
        self.delegation_data = None;
        self.fetching_assets = None;
        self.fetching_nns_assets = None;
        self.assets = None;
        self.sale_deal = None;
        self.processing_error = None;
    }

    pub(crate) fn get_derivation_path(&self) -> DerivationPath {
        vec![self.identity_number.unwrap().to_be_bytes().to_vec()]
    }

    pub(crate) fn get_ecdsa_as_uncompressed_public_key(&self) -> UncompressedPublicKey {
        PublicKey::from_slice(self.ecdsa_key.as_ref().unwrap().as_slice())
            .unwrap()
            .serialize_uncompressed()
    }

    pub(crate) fn get_ecdsa_as_asn1_block_public_key(&self) -> Asn1BlockPublicKey {
        uncompressed_public_key_to_asn1_block(self.get_ecdsa_as_uncompressed_public_key())
    }

    pub(crate) fn get_request_sender(&self) -> RequestSender {
        RequestSender::Ecdsa {
            ecdsa_derivation_path: self.get_derivation_path(),
            device_key: self.get_ecdsa_as_asn1_block_public_key(),
        }
    }

    pub(crate) fn get_request_sender_with_delegation(&self) -> RequestSender {
        let delegation_data = self.delegation_data.as_ref().unwrap();
        RequestSender::EcdsaWithDelegation {
            ecdsa_derivation_path: self.get_derivation_path(),
            device_key: delegation_data.public_key.clone(),
            delegation: SignedDelegation {
                delegation: Delegation {
                    pubkey: self.get_ecdsa_as_asn1_block_public_key(),
                    expiration: delegation_data.timestamp as u64,
                    targets: None,
                },
                signature: delegation_data.signature.as_ref().unwrap().clone(),
            },
        }
    }

    pub(crate) fn get_delegation_controller(&self) -> Option<Principal> {
        self.delegation_data
            .as_ref()
            .map(|delegation| Principal::self_authenticating(&delegation.public_key))
    }
}

// utility functions

pub(crate) fn compute_full_neurons_value(assets: &HolderAssets) -> TokenE8s {
    assets.nns_assets.as_ref().map_or(0, |accounts| {
        accounts
            .iter()
            .map(|account_assets| {
                account_assets
                    .assets
                    .as_ref()
                    .and_then(|nns| nns.controlled_neurons.as_ref())
                    .map_or(0, |neurons| {
                        neurons.value.iter().map(compute_full_neuron_value).sum()
                    })
            })
            .sum()
    })
}

fn compute_full_neuron_value(neuron: &NeuronAsset) -> TokenE8s {
    neuron
        .info
        .as_ref()
        .map_or(0, |fi| compute_info_neuron_value(&fi.value))
}

pub(crate) fn compute_info_neuron_value(neuron_info: &NeuronInformation) -> TokenE8s {
    (neuron_info.cached_neuron_stake_e8s
        + neuron_info.maturity_e8s_equivalent
        + neuron_info.staked_maturity_e8s_equivalent.unwrap_or(0))
    .saturating_sub(neuron_info.neuron_fees_e8s)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum UpgradeContractState {
    WaitingCertificateExpiration,
    WaitingAddControllerDelay { time: TimestampMillis },
    AllowAddController,
}
