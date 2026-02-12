use common_canister_types::{DelayedTimestampMillis, TimestampMillis};
use contract_canister_api::types::holder::{HolderProcessingError, HolderProcessingEvent};
use std::fmt::Debug;
use std::future::Future;
use std::pin::Pin;
use std::time::Duration;

use crate::components::Environment;
use crate::model::holder::{HolderLock, ProcessingTimer, ProcessingTimerType, UpdateHolderError};
use crate::state::CanisterState;
use crate::{get_env, log_error, log_info, mutate_state, read_state};

use super::factory::get_processor;

#[derive(Debug)]
pub enum ProcessingResult {
    Continue,
    Schedule { scheduled_time: TimestampMillis },
}

pub type Processor<'a> = Box<
    dyn Fn(
        &'a Environment,
        &'a HolderLock,
    )
        -> Pin<Box<dyn Future<Output = Result<ProcessingResult, HolderProcessingError>> + 'a>>,
>;

#[macro_export]
macro_rules! processor_toolkit {
    ($m:ident) => {
        Box::new(|env: &'a Environment, lock: &'a HolderLock| Box::pin($m::process(env, lock)))
    };
}

pub(crate) fn verify_processing_health() {
    let health = read_state(
        |state| match state.get_model().get_holder().get_processing_timer() {
            Some(timer) => {
                let now = state
                    .get_env()
                    .get_time()
                    .get_current_unix_epoch_time_millis();
                let health_delay = state.get_env().get_settings().processing_health_delay;
                let diff = now.saturating_sub(timer.scheduled_time);
                if diff < health_delay {
                    Ok(())
                } else {
                    Err(format!("expired {diff} ms"))
                }
            }
            None => Err("no timer".to_string()),
        },
    );

    if let Err(reason) = health {
        mutate_state(|state| {
            log_info!(
                state.get_env(),
                "Holder: detected died processing timer({reason}), recreating ..."
            );
            recreate_continue_timer(state);
        });
    }
}

pub(crate) fn update_holder_with_lock(
    event: HolderProcessingEvent,
) -> Result<(), UpdateHolderError> {
    let lock =
        try_lock_holder().map_err(|expiration| UpdateHolderError::HolderIsLocked { expiration })?;

    mutate_state(|state| {
        let env = state.get_env();

        let result = state
            .get_model_mut()
            .get_holder_mut()
            .update_holder(now(&env), &lock, event);

        if unlock_holder(state, &lock) {
            recreate_continue_timer(state);
        } else {
            log_error!(env, "Holder: cannot unlock after update: {lock:?}");
        }

        result
    })
}

pub(crate) async fn change_holder_with_lock<R>(
    changer: impl for<'a> Fn(&'a HolderLock) -> Pin<Box<dyn Future<Output = R> + 'a>>,
) -> Result<R, TimestampMillis> {
    let lock = try_lock_holder()?;

    let result = changer(&lock).await;

    mutate_state(|state| {
        if unlock_holder(state, &lock) {
            recreate_continue_timer(state);
        } else {
            log_error!(
                state.get_env(),
                "Holder: cannot unlock after change: {lock:?}"
            );
        }
    });

    Ok(result)
}

pub(crate) async fn process_holder_with_lock() {
    if let Ok(lock) = try_lock_holder() {
        process_holder(lock).await
    }
}

async fn process_holder(lock: HolderLock) {
    let env = get_env();

    let recreate_timer_fun: Box<dyn Fn(&mut CanisterState)> =
        match get_processor()(&env, &lock).await {
            Ok(ProcessingResult::Continue) => Box::new(recreate_continue_timer),
            Ok(ProcessingResult::Schedule { scheduled_time }) => {
                Box::new(move |state| recreate_schedule_processing_timer(state, scheduled_time))
            }
            Err(error) => {
                handle_processing_error(&lock, &error);

                let retry_delay = match error {
                    HolderProcessingError::IcAgentError { retry_delay, .. } => retry_delay,
                    _ => None,
                }
                .unwrap_or(env.get_settings().processing_error_delay);

                Box::new(move |state| recreate_retry_operation_timer(state, retry_delay))
            }
        };

    mutate_state(|state| {
        if unlock_holder(state, &lock) {
            recreate_timer_fun(state);
        } else {
            log_error!(env, "Holder: cannot unlock after processing: {lock:?}");
        }
    });
}

fn handle_processing_error(lock: &HolderLock, processing_error: &HolderProcessingError) {
    mutate_state(|state| {
        let env = state.get_env();
        log_error!(env, "Holder: processing error: {processing_error:?}");

        if let Err(handle_error) = state.get_model_mut().get_holder_mut().update_holder(
            env.get_time().get_current_unix_epoch_time_millis(),
            lock,
            HolderProcessingEvent::ProcessingError {
                error: processing_error.clone(),
            },
        ) {
            log_error!(
                env,
                "Holder: cannot handle processing error: {handle_error:?}"
            );
        }
    })
}

/// lock holder, set handle lock timer
fn try_lock_holder() -> Result<HolderLock, TimestampMillis> {
    mutate_state(|state| {
        let env = state.get_env();
        let lock_duration = env.get_settings().processing_lock_duration;

        state
            .get_model_mut()
            .get_holder_mut()
            .lock_holder(env.get_time().as_ref(), &lock_duration)
            .inspect(|_lock| {
                recreate_timer(
                    state,
                    ProcessingTimerType::HandleLockExpiration,
                    env.get_time()
                        .get_delayed_time_by_delay_millis(lock_duration + 1000),
                );
            })
    })
}

fn unlock_holder(state: &mut CanisterState, lock: &HolderLock) -> bool {
    state.get_model_mut().get_holder_mut().unlock_holder(lock)
}

fn recreate_schedule_processing_timer(state: &mut CanisterState, scheduled_time: TimestampMillis) {
    recreate_timer(
        state,
        ProcessingTimerType::ScheduleProcessing,
        state
            .get_env()
            .get_time()
            .get_delayed_time_millis(scheduled_time),
    )
}

fn recreate_continue_timer(state: &mut CanisterState) {
    let env = state.get_env();
    recreate_timer(
        state,
        ProcessingTimerType::ContinueProcessing,
        env.get_time()
            .get_delayed_time_by_delay_millis(env.get_settings().processing_step_delay),
    );
}

fn recreate_retry_operation_timer(state: &mut CanisterState, retry_delay: TimestampMillis) {
    let env = state.get_env();

    recreate_timer(
        state,
        ProcessingTimerType::RetryOperation,
        env.get_time().get_delayed_time_by_delay_millis(retry_delay),
    );
}

fn recreate_timer_for_recovery_panic_loop() {
    mutate_state(|state| {
        let processing_delay = state.get_env().get_settings().processing_error_delay;
        recreate_retry_operation_timer(state, processing_delay);
    })
}

fn recreate_timer(
    state: &mut CanisterState,
    timer_type: ProcessingTimerType,
    delayed_time: DelayedTimestampMillis,
) {
    // remove old timer
    if let Some(timer) = state.get_model().get_holder().get_processing_timer() {
        state.get_env().get_timer().clear_timer(timer.timer_id);
    }

    // set new timer
    let delay = Duration::from_millis(delayed_time.delay);
    let timer_id = if matches!(timer_type, ProcessingTimerType::HandleLockExpiration) {
        state
            .get_env()
            .get_timer()
            .set_timer(delay, Box::new(recreate_timer_for_recovery_panic_loop))
    } else {
        state.get_env().get_timer().set_timer(
            delay,
            Box::new(|| ic_cdk::futures::spawn_017_compat(process_holder_with_lock())),
        )
    };

    let timer = timer_id.map(|timer_id| ProcessingTimer {
        timer_type,
        timer_id,
        scheduled_time: delayed_time.time,
    });

    state
        .get_model_mut()
        .get_holder_mut()
        .set_processing_timer(timer);
}

fn now(env: &Environment) -> TimestampMillis {
    env.get_time().get_current_unix_epoch_time_millis()
}
