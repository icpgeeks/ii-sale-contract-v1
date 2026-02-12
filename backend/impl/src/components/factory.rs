use crate::components::referral::ReferralImpl;
use crate::components::Environment;
use candid::Principal;
use common_canister_impl::components::allowance_ledger::interface_impl::AllowanceLedgerImpl;
use common_canister_impl::components::ecdsa::interface_impl::EcdsaSignatureImpl;
use common_canister_impl::components::ic::{Ic, IcImpl};
use common_canister_impl::components::ic_agent::IcAgentImpl;
use common_canister_impl::components::ic_management::IcManagementImpl;
use common_canister_impl::components::icrc2_ledger::ICRC2LedgerImpl;
use common_canister_impl::components::identity::interface_impl::IdentityImpl;
use common_canister_impl::components::ledger::LedgerImpl;
use common_canister_impl::components::logger::LocalLoggerImpl;
use common_canister_impl::components::nns::interface_impl::NnsImpl;
use common_canister_impl::components::nns_dap::interface_impl::NnsDappImpl;
use common_canister_impl::components::rand::IcRandGenerator;
use common_canister_impl::components::time::TimeImpl;
use common_canister_impl::components::timer::TimerImpl;
use ic_ledger_types::AccountIdentifier;

use super::Settings;

const REFERRAL_CANISTER_ID: &str = "ixgih-eyaaa-aaaac-qdv2q-cai";

pub(crate) fn create_environment(root_public_key_raw: Vec<u8>) -> Environment {
    let settings = Settings {
        ic_url: "https://icp0.io/".to_owned(),
        nns_hostname: "https://nns.ic0.app".to_owned(),
        processing_lock_duration: 120_000,
        processing_error_delay: 60_000,
        processing_step_delay: 1,
        processing_health_delay: 300_000,
        ic_agent_request_poll_delay: 5_000,
        delegation_prepare_duration: 3 * 24 * 60 * 60 * 1000, // 3 days
        fetch_neurons_information_chunk_count: 250,
        quarantine_duration: 30 * 24 * 60 * 60 * 1000, // 30 days
        sale_deal_safe_close_duration: 10 * 24 * 60 * 60 * 1000, // 10 days
        default_number_of_subaccounts_to_check_for_no_approve: 10,
        min_sell_price_inclusively: 1_0000_0000, // 1 ICP
        developer_reward_permyriad: 50,          // 0.5%
        referral_reward_permyriad: 100,          // 1%
        hub_reward_permyriad: 50,                // 0.5%
        referral_reward_fallback_account: AccountIdentifier::from_hex(
            "8d7b886dd81f94445739578f52f6a6474d27d0468c16689be9fa2ac4b719928e",
        )
        .unwrap(),
        developer_reward_account: AccountIdentifier::from_hex(
            "b94a0a4ad2ed92cd67d57a5046eee0e34de6db095a5833bb3a5d6f30deaa309a",
        )
        .unwrap(),
        hub_reward_account: AccountIdentifier::from_hex(
            "295475b5a2fe35490464d900fe9e357f0ee11936526ba2ac1c2ad1d6dcd9b030",
        )
        .unwrap(),
        max_referral_length: 1024,
        max_buyer_offers: 100,
        add_contract_controller_delay: 5 * 24 * 60 * 60 * 1000, // 5 days
        max_neurons_allowed: 1000,
        max_subaccounts_allowed: 1000,
        warning_cycles_threshold_percentage: 25, // 25% is ~1T from 4.3 initial cycles
        critical_cycles_threshold_percentage: 17, // 17% is ~0.73T from 4.3 initial cycles
    };

    let ic_impl = IcImpl::new(root_public_key_raw);

    Environment::new(
        Box::new(LocalLoggerImpl {}),
        Box::new(TimeImpl {}),
        Box::new(TimerImpl {}),
        Box::new(LedgerImpl::new(
            ic_ledger_types::MAINNET_LEDGER_CANISTER_ID,
            ic_impl.get_canister(),
        )),
        Box::new(ICRC2LedgerImpl::new(
            ic_ledger_types::MAINNET_LEDGER_CANISTER_ID,
        )),
        Box::new(AllowanceLedgerImpl::new(
            ic_ledger_types::MAINNET_LEDGER_CANISTER_ID,
        )),
        Box::new(ic_impl),
        Box::new(IcManagementImpl {}),
        Box::new(EcdsaSignatureImpl::new("key_1".to_owned())),
        Box::new(IcRandGenerator {}),
        Box::new(IdentityImpl::default()),
        Box::new(NnsImpl::default()),
        Box::new(NnsDappImpl::default()),
        Box::new(IcAgentImpl {
            time: Box::pin(TimeImpl {}),
        }),
        Box::new(ReferralImpl::new(
            Principal::from_text(REFERRAL_CANISTER_ID).unwrap(),
        )),
        settings,
    )
}
