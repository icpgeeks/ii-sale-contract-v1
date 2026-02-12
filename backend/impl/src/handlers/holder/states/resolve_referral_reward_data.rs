use contract_canister_api::types::holder::{
    HolderProcessingError, HolderProcessingEvent, HolderState, HoldingProcessingEvent,
    HoldingState, SaleDealProcessingEvent, SaleDealState,
};

use crate::components::Environment;
use crate::handlers::holder::processor::ProcessingResult;
use crate::handlers::holder::states::{get_holder_model, update_holder};
use crate::handlers::wallet::get_sale_deal_transit_sub_account;
use crate::model::holder::events::sale::get_buyer_offer;
use crate::model::holder::HolderLock;
use crate::{log_error, log_info};

pub(crate) async fn process(
    env: &Environment,
    lock: &HolderLock,
) -> Result<ProcessingResult, HolderProcessingError> {
    log_info!(env, "Referral reward data: resolving ...");

    let (certificate, owner, referral) = get_holder_model(|state, model| {
        let buyer = match &model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::Hold {
                        sale_deal_state: Some(SaleDealState::Accept { buyer, .. }),
                        ..
                    },
            } => buyer,
            _ => panic!(),
        };

        let referral = get_buyer_offer(model, buyer)
            .unwrap()
            .referral
            .as_ref()
            .unwrap()
            .clone();

        let certificate = state
            .get_model()
            .get_init_contract_args()
            .certificate
            .contract_certificate
            .clone();

        (certificate, model.owner.as_ref().unwrap().value, referral)
    });

    let transit_sub_account = get_sale_deal_transit_sub_account(&owner);
    let transit_account = env.get_ledger().get_canister_account(&transit_sub_account);

    let result = env
        .get_referral()
        .get_referral_reward_data(certificate, owner, referral, transit_account.to_hex())
        .await;

    let event = match result {
        Ok(reward_data) => {
            log_info!(
                env,
                "Referral reward data: resolved, result: {reward_data:?}."
            );
            SaleDealProcessingEvent::ReferralRewardDataResolved { reward_data }
        }
        Err(reason) => {
            log_error!(
                env,
                "Referral reward data: resolve failed, reason: {reason:?}."
            );
            SaleDealProcessingEvent::ReferralRewardDataResolvingFailed { reason }
        }
    };

    update_holder(
        lock,
        HolderProcessingEvent::Holding {
            event: HoldingProcessingEvent::SaleDeal {
                event: Box::new(event),
            },
        },
    )?;

    Ok(ProcessingResult::Continue)
}
