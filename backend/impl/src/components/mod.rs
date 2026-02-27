use common_canister_impl::components::allowance_ledger::interface::AllowanceLedger;
use common_canister_impl::components::ic::Ic;
use common_canister_impl::components::ic_agent::IcAgent;
use common_canister_impl::components::ic_management::IcManagement;
use common_canister_impl::components::identity::interface::Identity;
use common_canister_impl::components::ledger::Ledger;
use common_canister_impl::components::logger::Logger;
use common_canister_impl::components::nns::interface::Nns;
use common_canister_impl::components::nns_dap::interface::NnsDapp;
use common_canister_impl::components::rand::RandGenerator;
use common_canister_impl::components::time::Time;
use common_canister_impl::components::timer::Timer;
use common_canister_impl::components::{
    ecdsa::interface::EcdsaSignature, icrc2_ledger::ICRC2Ledger,
};
use common_canister_impl::handlers::ic_request::builder::BuildRequestEnvironment;
use common_canister_types::{TimestampMillis, TokenE8s};
use ic_ledger_types::AccountIdentifier;
use std::rc::Rc;

use crate::components::referral::Referral;

#[cfg(not(any(network = "local", network = "test")))]
pub mod factory;

#[cfg(network = "local")]
#[path = "../../../../target/factory_local.rs"]
pub mod factory;

#[cfg(network = "test")]
#[path = "../../../../target/factory_test.rs"]
pub mod factory;

pub mod referral;

pub struct Environment {
    ic: Rc<dyn Ic>,
    ic_management: Rc<dyn IcManagement>,
    logger: Rc<dyn Logger>,
    time: Rc<dyn Time>,
    timer: Rc<dyn Timer>,
    ecdsa: Rc<dyn EcdsaSignature>,
    rand: Rc<dyn RandGenerator>,
    identity: Rc<dyn Identity>,
    nns: Rc<dyn Nns>,
    nns_dapp: Rc<dyn NnsDapp>,
    ledger: Rc<dyn Ledger>,
    icrc2_ledger: Rc<dyn ICRC2Ledger>,
    allowance_ledger: Rc<dyn AllowanceLedger>,
    ic_agent: Rc<dyn IcAgent>,
    referral: Rc<dyn Referral>,
    settings: Settings,
}

pub struct Settings {
    pub ic_url: String,
    pub nns_hostname: String,
    pub processing_lock_duration: TimestampMillis,
    pub processing_error_delay: TimestampMillis,
    pub processing_step_delay: TimestampMillis,
    pub processing_health_delay: TimestampMillis,
    pub ic_agent_request_poll_delay: TimestampMillis,
    pub delegation_prepare_duration: TimestampMillis,
    pub fetch_neurons_information_chunk_count: usize,
    pub quarantine_duration: TimestampMillis,
    pub sale_deal_safe_close_duration: TimestampMillis,
    pub default_number_of_subaccounts_to_check_for_no_approve: usize,
    pub max_referral_length: usize,
    pub min_sell_price_inclusively: TokenE8s,
    pub developer_reward_permyriad: u32,
    pub referral_reward_permyriad: u32,
    pub hub_reward_permyriad: u32,
    pub developer_reward_account: AccountIdentifier,
    pub referral_reward_fallback_account: AccountIdentifier,
    pub hub_reward_account: AccountIdentifier,
    pub max_buyer_offers: usize,
    pub add_contract_controller_delay: TimestampMillis,
    pub max_subaccounts_allowed: usize,
    pub max_neurons_allowed: usize,
    pub warning_cycles_threshold_percentage: u8,
    pub critical_cycles_threshold_percentage: u8,
}

impl Environment {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        logger: Box<dyn Logger>,
        time: Box<dyn Time>,
        timer: Box<dyn Timer>,
        ledger: Box<dyn Ledger>,
        icrc2_ledger: Box<dyn ICRC2Ledger>,
        allowance_ledger: Box<dyn AllowanceLedger>,
        ic: Box<dyn Ic>,
        ic_management: Box<dyn IcManagement>,
        ecdsa: Box<dyn EcdsaSignature>,
        rand: Box<dyn RandGenerator>,
        identity: Box<dyn Identity>,
        nns: Box<dyn Nns>,
        nns_dapp: Box<dyn NnsDapp>,
        ic_agent: Box<dyn IcAgent>,
        referral: Box<dyn Referral>,
        settings: Settings,
    ) -> Self {
        Self {
            ic: ic.into(),
            ic_management: ic_management.into(),
            logger: logger.into(),
            time: time.into(),
            timer: timer.into(),
            ecdsa: ecdsa.into(),
            rand: rand.into(),
            identity: identity.into(),
            nns: nns.into(),
            nns_dapp: nns_dapp.into(),
            ledger: ledger.into(),
            icrc2_ledger: icrc2_ledger.into(),
            allowance_ledger: allowance_ledger.into(),
            ic_agent: ic_agent.into(),
            referral: referral.into(),
            settings,
        }
    }

    pub fn get_logger(&self) -> Rc<dyn Logger> {
        Rc::clone(&self.logger)
    }

    pub fn get_ic(&self) -> Rc<dyn Ic> {
        Rc::clone(&self.ic)
    }

    pub fn get_ic_management(&self) -> Rc<dyn IcManagement> {
        Rc::clone(&self.ic_management)
    }

    pub fn get_time(&self) -> Rc<dyn Time> {
        Rc::clone(&self.time)
    }

    pub fn get_timer(&self) -> Rc<dyn Timer> {
        Rc::clone(&self.timer)
    }

    pub fn get_ecdsa(&self) -> Rc<dyn EcdsaSignature> {
        Rc::clone(&self.ecdsa)
    }

    pub fn get_identity(&self) -> Rc<dyn Identity> {
        Rc::clone(&self.identity)
    }

    pub fn get_nns(&self) -> Rc<dyn Nns> {
        Rc::clone(&self.nns)
    }

    pub fn get_nns_dapp(&self) -> Rc<dyn NnsDapp> {
        Rc::clone(&self.nns_dapp)
    }

    pub fn get_ledger(&self) -> Rc<dyn Ledger> {
        Rc::clone(&self.ledger)
    }

    pub fn get_icrc2_ledger(&self) -> Rc<dyn ICRC2Ledger> {
        Rc::clone(&self.icrc2_ledger)
    }

    pub fn get_allowance_ledger(&self) -> Rc<dyn AllowanceLedger> {
        Rc::clone(&self.allowance_ledger)
    }

    pub fn get_settings(&self) -> &Settings {
        &self.settings
    }

    pub fn get_ic_agent(&self) -> Rc<dyn IcAgent> {
        Rc::clone(&self.ic_agent)
    }

    pub fn get_referral(&self) -> Rc<dyn Referral> {
        Rc::clone(&self.referral)
    }
}

impl BuildRequestEnvironment for Environment {
    fn get_time_(&self) -> Rc<dyn Time> {
        Rc::clone(&self.time)
    }

    fn get_rand_generator(&self) -> Rc<dyn RandGenerator> {
        Rc::clone(&self.rand)
    }

    fn get_ecdsa_signature(&self) -> Rc<dyn EcdsaSignature> {
        Rc::clone(&self.ecdsa)
    }
}

#[macro_export]
macro_rules! log_debug {
    ($dst:expr, $($arg:tt)*) => {
        $dst.get_logger().debug(format!($($arg)*).as_str())
    };
}

#[macro_export]
macro_rules! log_info {
    ($dst:expr, $($arg:tt)*) => {
        $dst.get_logger().info(format!($($arg)*).as_str())
    };
}

#[macro_export]
macro_rules! log_error {
    ($dst:expr, $($arg:tt)*) => {
        $dst.get_logger().error(format!($($arg)*).as_str())
    };
}
