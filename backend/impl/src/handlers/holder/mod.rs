use crate::handlers::cycles_calculator::CyclesCalculator;
use crate::model::holder::{HolderModel, ProcessingTimer, ProcessingTimerType};
use common_canister_types::TimestampMillis;
use contract_canister_api::types::holder::HolderInformation;

use crate::components::Environment;
use crate::read_state;

pub mod factory;
pub mod processor;
pub mod states;

pub(crate) fn build_holder_information_with_load() -> HolderInformation {
    read_state(|state| {
        let holder = state.get_model().get_holder();
        let holder_model = holder.get_holder_model();
        let update_version = holder.get_events_len();
        let processing_timer = holder.get_processing_timer();
        build_holder_information(
            &state.get_env(),
            holder_model,
            update_version,
            processing_timer,
        )
    })
}

fn build_holder_information(
    env: &Environment,
    holder_model: &HolderModel,
    update_version: u64,
    processing_timer: Option<&ProcessingTimer>,
) -> HolderInformation {
    HolderInformation {
        owner: holder_model.owner.as_ref().map(|v| v.value),
        state: holder_model.state.value.clone(),
        identity_number: holder_model.identity_number,
        identity_name: holder_model.identity_name.clone(),
        holding_timestamp: holder_model.holding_timestamp,
        sale_deal: holder_model.sale_deal.clone(),
        completed_sale_deal: holder_model.completed_sale_deal.clone(),
        processing_error: holder_model.processing_error.clone(),
        fetching_assets: holder_model.fetching_assets.clone(),
        assets: holder_model.assets.clone(),
        schedule_processing: processing_timer.and_then(|t| {
            if matches!(t.timer_type, ProcessingTimerType::HandleLockExpiration) {
                None
            } else {
                Some(env.get_time().get_delayed_time_millis(t.scheduled_time))
            }
        }),
        update_version,
        canister_cycles_state: CyclesCalculator::new(env, holder_model.initial_cycles)
            .get_cycles_state()
            .clone(),
    }
}

pub(crate) fn get_checked_sale_deal_expiration_time() -> Result<TimestampMillis, ()> {
    read_state(|state| {
        let certificate_expiration = state
            .get_model()
            .get_init_contract_args()
            .certificate
            .contract_certificate
            .expiration;

        let env = state.get_env();

        let sale_deal_expiration_time =
            certificate_expiration.saturating_sub(env.get_settings().sale_deal_safe_close_duration);

        let now = env.get_time().get_current_unix_epoch_time_millis();
        if now < sale_deal_expiration_time {
            Ok(sale_deal_expiration_time)
        } else {
            Err(())
        }
    })
}
