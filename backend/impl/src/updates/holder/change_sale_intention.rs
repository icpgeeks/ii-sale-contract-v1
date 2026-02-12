use crate::{
    guards::caller_is_owner, handlers::holder::processor::update_holder_with_lock, log_info,
    model::holder::UpdateHolderError,
};
use common_canister_impl::components::ledger::validate_ledger_account;
use contract_canister_api::{
    change_sale_intention::*,
    types::holder::{HolderProcessingEvent, HoldingProcessingEvent, SaleDealProcessingEvent},
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn change_sale_intention(args: Args) -> Response {
    change_sale_intention_int(args).await.into()
}

pub(crate) async fn change_sale_intention_int(
    Args { receiver_account }: Args,
) -> Result<ChangeSaleIntentionResult, ChangeSaleIntentionError> {
    caller_is_owner().map_err(|_| ChangeSaleIntentionError::PermissionDenied)?;

    let env = get_env();

    if !validate_ledger_account(&receiver_account) {
        return Err(ChangeSaleIntentionError::InvalidAccountIdentifier);
    }

    log_info!(
        env,
        "Sale intention: updating, new receiver account: {receiver_account:?}"
    );

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::SaleDeal {
            event: Box::new(SaleDealProcessingEvent::ChangeSaleIntention { receiver_account }),
        },
    })
    .map(|_| ChangeSaleIntentionResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => ChangeSaleIntentionError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => {
            ChangeSaleIntentionError::HolderLocked {
                lock: env.get_time().get_delayed_time_millis(expiration),
            }
        }
    })
}
