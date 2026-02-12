use crate::handlers::holder::processor::update_holder_with_lock;
use crate::model::holder::UpdateHolderError;
use crate::{get_env, log_info, read_state};
use common_contract_api::{activate_contract::*, get_contract_activation_code_hash};
use contract_canister_api::types::holder::HolderProcessingEvent;
use ic_cdk_macros::update;

#[update]
async fn activate_contract(args: Args) -> Response {
    activate_contract_int(args).await.into()
}

pub(crate) async fn activate_contract_int(
    Args {
        contract_owner,
        check_permission_strategy,
    }: Args,
) -> Result<(), ActivateContractError> {
    let env = get_env();

    check_permission(check_permission_strategy)?;

    log_info!(
        env,
        "Contract: activating by owner: {}",
        contract_owner.to_text(),
    );

    update_holder_with_lock(HolderProcessingEvent::ContractActivated {
        owner: contract_owner,
    })
    .map_err(|error| match error {
        UpdateHolderError::WrongState => ActivateContractError::ContractCallError {
            reason: "wrong state for activate contract".to_owned(),
        },
        UpdateHolderError::HolderIsLocked { expiration } => ActivateContractError::ContractLocked {
            lock: env.get_time().get_delayed_time_millis(expiration),
        },
    })
}

fn check_permission(strategy: CheckPermissionStrategy) -> Result<(), ActivateContractError> {
    read_state(|state| {
        let model = state.get_model();
        if model.is_contract_activated() {
            let owner = model
                .get_holder()
                .get_holder_model()
                .owner
                .as_ref()
                .unwrap()
                .value;
            return Err(ActivateContractError::AlreadyActivated { owner });
        }

        let init_args = state.get_model().get_init_contract_args();
        let contract_activation_code_hash = init_args.contract_activation_code_hash.as_ref();

        match strategy {
            CheckPermissionStrategy::CheckCallerIsDeployer => {
                if contract_activation_code_hash.is_some() {
                    return Err(ActivateContractError::ValidationFailed {
                        reason: "Contract can be activated only via activation code".to_owned(),
                    });
                }

                let caller = state.get_env().get_ic().get_caller();
                let deployer = init_args.certificate.contract_certificate.deployer;

                if caller == deployer {
                    Ok(())
                } else {
                    Err(ActivateContractError::ValidationFailed {
                        reason: "caller is not deployer".to_owned(),
                    })
                }
            }
            CheckPermissionStrategy::CheckContractActivationCode { code } => {
                if contract_activation_code_hash.is_none() {
                    return Err(ActivateContractError::ValidationFailed {
                        reason: "Contract can be activated only via check deployer".to_owned(),
                    });
                }

                let code_hash = get_contract_activation_code_hash(code);
                if &code_hash == contract_activation_code_hash.unwrap() {
                    Ok(())
                } else {
                    Err(ActivateContractError::ValidationFailed {
                        reason: "wrong activation code".to_owned(),
                    })
                }
            }
        }
    })
}
