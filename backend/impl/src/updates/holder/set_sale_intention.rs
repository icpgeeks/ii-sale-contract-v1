use crate::{
    guards::caller_is_owner,
    handlers::holder::{get_checked_sale_deal_expiration_time, processor::update_holder_with_lock},
    log_info,
    model::holder::UpdateHolderError,
};
use common_canister_impl::components::ledger::validate_ledger_account;
use common_canister_types::LedgerAccount;
use contract_canister_api::{
    set_sale_intention::*,
    types::holder::{HolderProcessingEvent, HoldingProcessingEvent, SaleDealProcessingEvent},
};
use ic_cdk_macros::update;

use crate::{get_env, handlers::holder::build_holder_information_with_load};

#[update]
async fn set_sale_intention(Args { receiver_account }: Args) -> Response {
    set_sale_intention_int(receiver_account).await.into()
}

pub(crate) async fn set_sale_intention_int(
    receiver_account: LedgerAccount,
) -> Result<SetSaleIntentionResult, SetSaleIntentionError> {
    caller_is_owner().map_err(|_| SetSaleIntentionError::PermissionDenied)?;

    let env = get_env();

    if !validate_ledger_account(&receiver_account) {
        return Err(SetSaleIntentionError::InvalidAccountIdentifier);
    }

    let sale_deal_expiration_time = get_checked_sale_deal_expiration_time()
        .map_err(|_| SetSaleIntentionError::CertificateExpirationImminent)?;

    log_info!(
        env,
        "Sale intention: setting with receiver account: {receiver_account:?}"
    );

    update_holder_with_lock(HolderProcessingEvent::Holding {
        event: HoldingProcessingEvent::SaleDeal {
            event: Box::new(SaleDealProcessingEvent::SetSaleIntention {
                sale_deal_expiration_time,
                receiver_account,
            }),
        },
    })
    .map(|_| SetSaleIntentionResult {
        holder_information: build_holder_information_with_load(),
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => SetSaleIntentionError::HolderWrongState,
        UpdateHolderError::HolderIsLocked { expiration } => SetSaleIntentionError::HolderLocked {
            lock: env.get_time().get_delayed_time_millis(expiration),
        },
    })
}
