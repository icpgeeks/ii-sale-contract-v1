use crate::components::factory;
use crate::model::ContractModel;
use crate::state::CanisterState;
use crate::{get_env, init_state, log_info};
use common_contract_api::init_contract::InitContractArgs;
use ic_cdk_macros::init;

use include_dir::{include_dir, Dir};

#[init]
fn init(args: InitContractArgs) {
    let env = factory::create_environment(args.root_public_key_raw.clone());
    let time = env.get_time().get_current_unix_epoch_time_millis();
    let cycles = env.get_ic().get_canister_metrics().cycles;

    let model = ContractModel::init(args, time, cycles);

    init_state(CanisterState::new(env, model));
    init_http_assets();

    log_info!(
        get_env(),
        "Identity contract: initialized with cycles: {}.",
        cycles
    );
}

static ASSETS_DIR: Dir<'_> = include_dir!("release/frontend");

pub(crate) fn init_http_assets() {
    common_embed_assets::certify_all_assets(
        &ASSETS_DIR,
        Some(get_env().get_ic().get_canister().to_text().as_str()),
    );
}
