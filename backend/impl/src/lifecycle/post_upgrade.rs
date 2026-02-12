use crate::components::factory::{self};
use crate::lifecycle::init::init_http_assets;
use crate::model::ContractModel;
use crate::state::CanisterState;
use crate::{get_env, init_state, log_info};
use candid::Principal;
use common_contract_api::init_contract::InitContractArgs;
use common_contract_api::{ContractCertificate, SignedContractCertificate};
use ic_cdk_macros::post_upgrade;

#[post_upgrade]
fn post_upgrade() {
    let args = InitContractArgs {
        root_public_key_raw: vec![],
        certificate: SignedContractCertificate {
            contract_certificate: ContractCertificate {
                hub_canister: Principal::anonymous(),
                deployer: Principal::anonymous(),
                contract_template_id: 0,
                contract_canister: Principal::anonymous(),
                contract_wasm_hash: "".to_owned(),
                expiration: 0,
            },
            signature: vec![],
        },
        contract_activation_code_hash: None,
    };

    let mut env = factory::create_environment(args.root_public_key_raw.clone());
    let time = env.get_time().get_current_unix_epoch_time_millis();
    let cycles = env.get_ic().get_canister_metrics().cycles;

    let model = ContractModel::init(args, time, cycles);
    env = factory::create_environment(model.get_init_contract_args().root_public_key_raw.clone());

    init_state(CanisterState::new(env, model));
    init_http_assets();
    log_info!(get_env(), "Identity contract: post-upgrade completed.");
}
