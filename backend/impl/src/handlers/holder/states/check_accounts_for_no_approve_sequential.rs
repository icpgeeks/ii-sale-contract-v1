use candid::Principal;
use common_canister_impl::components::ledger::vec_to_slice32;
use contract_canister_api::types::holder::{
    CheckAssetsEvent, CheckAssetsState, HolderProcessingError, HolderProcessingEvent, HolderState,
    HoldingProcessingEvent, HoldingState,
};
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc103::get_allowances::GetAllowancesArgs;

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, to_internal_error, update_holder};
use crate::log_info;
use crate::model::holder::HolderLock;

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    let (nns_principal, sub_account) = get_holder_model(|_, model| match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::CheckAssets {
                    sub_state:
                        CheckAssetsState::CheckAccountsForNoApproveSequential { sub_accounts },
                    ..
                },
        } => Ok((
            Principal::self_authenticating(
                model
                    .delegation_data
                    .as_ref()
                    .unwrap()
                    .public_key
                    .as_slice(),
            ),
            sub_accounts.first().unwrap().clone(),
        )),
        _ => Err(HolderProcessingError::InternalError {
            error: "Invalid state".to_string(),
        }),
    })?;

    let result = env
        .get_allowance_ledger()
        .get_allowances(GetAllowancesArgs {
            from_account: Some(Account {
                owner: nns_principal,
                subaccount: Some(vec_to_slice32(&sub_account).unwrap()),
            }),
            prev_spender: None,
            take: Some(1u64.into()),
        })
        .await;

    let event = match result {
        Ok(allowance) if allowance.is_empty() => {
            log_info!(
                env,
                "Account approvals: sub account {} checked.",
                hex::encode(&sub_account)
            );

            Ok(CheckAssetsEvent::CheckAccountsAdvance { sub_account })
        }
        Ok(_) => {
            log_info!(
                env,
                "Account approvals: sub account {} has approve.",
                hex::encode(&sub_account)
            );

            Ok(CheckAssetsEvent::AccountHasApprove { sub_account })
        }
        Err(error) => Err(to_internal_error(error)),
    }?;

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::CheckAssets { event },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
