use std::{future::Future, pin::Pin};

use crate::{
    components::Environment,
    get_env,
    handlers::{
        cycles_calculator::CyclesCalculator,
        holder::processor::{change_holder_with_lock, verify_processing_health},
    },
    log_info,
    model::holder::{HolderLock, IdentityHolder, UpdateHolderError, UpgradeContractState},
    mutate_state, read_state,
};
use candid::Principal;
use common_contract_api::add_contract_controller::*;
use contract_canister_api::types::holder::{HolderProcessingEvent, HolderState};
use ic_cdk::management_canister::{CanisterSettings, UpdateSettingsArgs};
use ic_cdk_macros::update;

#[update]
async fn add_contract_controller(args: Args) -> Response {
    add_contract_controller_int(args).await.into()
}

pub(crate) async fn add_contract_controller_int(
    Args { controller }: Args,
) -> Result<(), AddContractControllerError> {
    let env = get_env();
    let caller = env.get_ic().get_caller();

    check_availability(caller)?;

    verify_processing_health();

    change_holder_with_lock(
        |lock: &HolderLock| -> Pin<Box<dyn Future<Output = Result<(), AddContractControllerError>> + '_>> {
            Box::pin(update_upgrade_contract_state_with_lock(caller, lock))
        },
    )
    .await
    .map_err(|expiration| AddContractControllerError::ContractLocked {
        lock: env.get_time().get_delayed_time_millis(expiration),
    })
    .and_then(|result| result)?;

    log_info!(env, "Contract: adding controller {}", controller.to_text());

    add_controller(env.as_ref(), controller).await
}

fn check_availability(caller: Principal) -> Result<(), AddContractControllerError> {
    read_state(|state| {
        // CHECK CONTRACT ACTIVATED
        let model = &state.get_model();
        if !model.is_contract_activated() {
            return Err(AddContractControllerError::ContractNotActivated);
        }

        // CHECK CALLER IS OWNER
        let owner = model
            .get_holder()
            .get_holder_model()
            .owner
            .as_ref()
            .unwrap()
            .value;
        if owner != caller {
            return Err(AddContractControllerError::PermissionDenied);
        }

        // CHECK CERTIFICATE EXPIRATION
        let now = state
            .get_env()
            .get_time()
            .get_current_unix_epoch_time_millis();

        let certificate_expiration = model
            .get_init_contract_args()
            .certificate
            .contract_certificate
            .expiration;

        if now < certificate_expiration {
            return Err(AddContractControllerError::CertificateNotExpired);
        }

        Ok(())
    })
}

async fn update_upgrade_contract_state_with_lock(
    caller: Principal,
    lock: &HolderLock,
) -> Result<(), AddContractControllerError> {
    check_availability(caller)?;

    mutate_state(|state| {
        let env = state.get_env();
        let now = env.get_time().get_current_unix_epoch_time_millis();

        let holder_mut = state.get_model_mut().get_holder_mut();
        let holder_model = holder_mut.get_holder_model();
        match holder_model.upgrade_contract_state.value {
            UpgradeContractState::WaitingCertificateExpiration => {
                // CHECK NEED CLOSE SALE DEAL
                if matches!(&holder_model.state.value, HolderState::Holding { sub_state } if sub_state.get_sale_deal_state().is_some())
                {
                    // CHECK ALLOW CYCLES
                    let cycles_calculator =
                        CyclesCalculator::new(env.as_ref(), holder_model.initial_cycles);

                    if cycles_calculator.is_critical_cycles_level() {
                        return Err(AddContractControllerError::CriticalCyclesLevel {
                            critical_threshold_cycles: cycles_calculator
                                .get_cycles_state()
                                .critical_threshold_cycles,
                        });
                    }

                    let time = now + env.get_settings().add_contract_controller_delay;
                    update_upgrade_contract_state(
                        env.as_ref(),
                        holder_mut,
                        lock,
                        HolderProcessingEvent::DelayAddContractController { time },
                    )?;

                    Err(AddContractControllerError::AddControllerDelay {
                        delay: env.get_time().get_delayed_time_millis(time),
                    })
                } else {
                    update_upgrade_contract_state(
                        env.as_ref(),
                        holder_mut,
                        lock,
                        HolderProcessingEvent::AllowAddContractController,
                    )
                }
            }
            UpgradeContractState::WaitingAddControllerDelay { time } => {
                if now < time {
                    Err(AddContractControllerError::AddControllerDelay {
                        delay: env.get_time().get_delayed_time_millis(time),
                    })
                } else {
                    update_upgrade_contract_state(
                        env.as_ref(),
                        holder_mut,
                        lock,
                        HolderProcessingEvent::AllowAddContractController,
                    )
                }
            }
            UpgradeContractState::AllowAddController => Ok(()),
        }
    })
}

fn update_upgrade_contract_state(
    env: &Environment,
    holder: &mut IdentityHolder,
    lock: &HolderLock,
    event: HolderProcessingEvent,
) -> Result<(), AddContractControllerError> {
    holder
        .update_holder(
            env.get_time().get_current_unix_epoch_time_millis(),
            lock,
            event,
        )
        .map_err(|error| match error {
            UpdateHolderError::WrongState => AddContractControllerError::ContractNotActivated,
            UpdateHolderError::HolderIsLocked { expiration } => {
                AddContractControllerError::ContractLocked {
                    lock: env.get_time().get_delayed_time_millis(expiration),
                }
            }
        })
}

async fn add_controller(
    env: &Environment,
    controller: Principal,
) -> Result<(), AddContractControllerError> {
    let canister_id = env.get_ic().get_canister();
    let arg = UpdateSettingsArgs {
        canister_id,
        settings: CanisterSettings {
            controllers: Some(vec![canister_id, controller]),
            compute_allocation: None,
            memory_allocation: None,
            freezing_threshold: None,
            reserved_cycles_limit: None,
            log_visibility: None,
            wasm_memory_limit: None,
            wasm_memory_threshold: None,
            environment_variables: None,
        },
    };

    env.get_ic_management()
        .update_settings(arg)
        .await
        .map_err(|error| AddContractControllerError::ManagementCallError {
            reason: format!("{error:?}"),
        })?;

    Ok(())
}
