#[cfg(test)]
mod tests {

    mod activate_contract;
    mod add_contract_controller;
    mod check_assets;
    mod components;
    mod expiration;
    mod fetch_assets;
    mod holder_auth_registration;
    mod releasing;
    mod rewards_calculator;
    mod sale;
    //    mod serde_candid;
    mod start_capture;

    use crate::components::{Environment, Settings};
    use crate::init_state;
    use crate::model::ContractModel;
    use crate::state::CanisterState;
    use crate::test::tests::components::allowance_ledger::AllowanceLedgerTest;
    use crate::test::tests::components::ecdsa::{EcdsaTest, PUBLIC_KEY};
    use crate::test::tests::components::ic::{IcTest, TEST_CANISTER_CYCLES};
    use crate::test::tests::components::ic_agent::IcAgentTest;
    use crate::test::tests::components::ic_management::IcManagementTest;
    use crate::test::tests::components::icrc2_ledger::ICRC2LedgerTest;
    use crate::test::tests::components::identity::IdentityTest;
    use crate::test::tests::components::ledger::LedgerTest;
    use crate::test::tests::components::logger::PrintLoggerImpl;
    use crate::test::tests::components::rand::IcRandTest;
    use crate::test::tests::components::referral::ReferralTest;
    use crate::test::tests::components::time::TimeTest;
    use crate::test::tests::components::timer::TimerTest;
    use candid::Principal;
    use common_canister_impl::components::ic::Ic;
    use common_canister_impl::components::identity::interface_impl::IdentityImpl;
    use common_canister_impl::components::nns::interface_impl::NnsImpl;
    use common_canister_impl::components::nns_dap::interface_impl::NnsDappImpl;
    use common_canister_types::TimestampMillis;
    use common_contract_api::init_contract::InitContractArgs;
    use common_contract_api::{ContractCertificate, SignedContractCertificate};
    use ic_ledger_types::AccountIdentifier;

    pub const HT_CAPTURED_IDENTITY_NUMBER: u64 = 555;

    pub(crate) fn ht_get_test_hub_canister() -> Principal {
        Principal::from_text("xapqu-4qaaa-aaaak-quexq-cai").unwrap()
    }

    pub(crate) fn ht_get_test_deployer() -> Principal {
        Principal::from_text("lpag6-ktxsv-3oewm-s4gok-fzo2e-qcn2v-kzdpi-eozwc-ddv2o-rbbx4-wae")
            .unwrap()
    }

    pub(crate) fn ht_get_test_buyer() -> Principal {
        Principal::from_text("grgxs-ya6qh-buomj-2rlpb-wpumc-ykc5d-dtrtg-yv2xm-5m43v-dfszy-aqe")
            .unwrap()
    }

    pub(crate) fn ht_get_test_contract_canister() -> Principal {
        Principal::from_text("qxzmw-5aaaa-aaaak-qudza-cai").unwrap()
    }

    pub(crate) fn ht_get_test_other() -> Principal {
        Principal::from_text("xon54-haaaa-aaaak-quewq-cai").unwrap()
    }

    pub(crate) fn ht_init_test_contract(
        certificate_expiration: TimestampMillis,
        contract_activation_code_hash: Option<Vec<u8>>,
    ) {
        ht_init_test_contract_with_settings(
            certificate_expiration,
            contract_activation_code_hash,
            ht_create_settings(),
        )
    }

    pub(crate) fn ht_init_test_contract_with_settings(
        certificate_expiration: TimestampMillis,
        contract_activation_code_hash: Option<Vec<u8>>,
        settings: Settings,
    ) {
        let args = InitContractArgs {
            root_public_key_raw: vec![1, 2, 3],
            certificate: SignedContractCertificate {
                contract_certificate: ContractCertificate {
                    hub_canister: ht_get_test_hub_canister(),
                    deployer: ht_get_test_deployer(),
                    contract_template_id: 1,
                    contract_canister: ht_get_test_contract_canister(),
                    contract_wasm_hash: "hahaha".to_owned(),
                    expiration: certificate_expiration,
                },
                signature: vec![4, 5, 6],
            },
            contract_activation_code_hash,
        };

        ht_init_contract(args, settings);
    }

    pub(crate) fn ht_init_contract(args: InitContractArgs, settings: Settings) {
        ht_init_contract_int(args, |model| {
            ht_create_environment(
                IcTest {
                    root_public_key_raw: model.get_init_contract_args().root_public_key_raw.clone(),
                    canister: model
                        .get_init_contract_args()
                        .certificate
                        .contract_certificate
                        .contract_canister
                        .clone(),
                },
                settings,
            )
        });
    }

    pub(crate) fn ht_init_contract_int<F>(args: InitContractArgs, env_builder: F)
    where
        F: FnOnce(&ContractModel) -> Environment,
    {
        let model = ContractModel::init(args, 0, TEST_CANISTER_CYCLES);
        init_state(CanisterState::new(env_builder(&model), model));
    }

    pub fn ht_create_environment(ic: IcTest, settings: Settings) -> Environment {
        Environment::new(
            Box::new(PrintLoggerImpl {}),
            Box::new(TimeTest {}),
            Box::new(TimerTest {}),
            Box::new(LedgerTest::new(ic.get_canister())),
            Box::new(ICRC2LedgerTest {}),
            Box::new(AllowanceLedgerTest {}),
            Box::new(ic),
            Box::new(IcManagementTest {}),
            Box::new(EcdsaTest {}),
            Box::new(IcRandTest {}),
            Box::new(IdentityTest {
                proxy: IdentityImpl::new(
                    Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap(),
                ),
            }),
            Box::new(NnsImpl::new(
                Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            )),
            Box::new(NnsDappImpl::new(
                Principal::from_text("qsgjb-riaaa-aaaaa-aaaga-cai").unwrap(),
            )),
            Box::new(IcAgentTest {}),
            Box::new(ReferralTest {}),
            settings,
        )
    }

    pub const HT_SALE_DEAL_SAFE_CLOSE_DURATION: u64 = 24 * 60 * 60 * 1000;
    pub const HT_QUARANTINE_DURATION: u64 = 10 * 60_000;
    pub const HT_MIN_PRICE: u64 = 100_000_000;
    pub const HT_DEVELOPER_REWARDS_PERMYRIAD: u32 = 1_000;
    pub const HT_REFERRAL_REWARDS_PERMYRIAD: u32 = 1_000;
    pub const HT_HUB_REWARDS_PERMYRIAD: u32 = 1_000;

    pub(crate) fn ht_create_settings() -> Settings {
        Settings {
            ic_url: "https://icp0.io/".to_owned(),
            nns_hostname: "https://nns.ic0.app".to_owned(),
            processing_lock_duration: 60_000,
            processing_error_delay: 15_000,
            processing_step_delay: 1,
            processing_health_delay: 2 * 3_600 * 1000,
            ic_agent_request_poll_delay: 5_000,
            delegation_prepare_duration: 30 * 24 * 60 * 60 * 1000,
            fetch_neurons_information_chunk_count: 10,
            quarantine_duration: HT_QUARANTINE_DURATION,
            sale_deal_safe_close_duration: HT_SALE_DEAL_SAFE_CLOSE_DURATION,
            default_number_of_subaccounts_to_check_for_no_approve: 4,
            developer_reward_permyriad: HT_DEVELOPER_REWARDS_PERMYRIAD,
            referral_reward_permyriad: HT_REFERRAL_REWARDS_PERMYRIAD,
            hub_reward_permyriad: HT_HUB_REWARDS_PERMYRIAD,
            referral_reward_fallback_account: AccountIdentifier::from_hex(
                "958a48bc0e7da3425850cc0527a325a2f1ef6452fb91658fe63634560e7c416d",
            )
            .unwrap(),
            developer_reward_account: AccountIdentifier::from_hex(
                "cb412356675bee69c8283a642d83b085f6bca90785db764865a6d2ea7c4f3695",
            )
            .unwrap(),
            hub_reward_account: AccountIdentifier::from_hex(
                "e142e3a2f699b5309e7a8c47f40546fa90a8e00baca1ed7f66c4b87e2727af5e",
            )
            .unwrap(),
            min_sell_price_inclusively: HT_MIN_PRICE,
            max_referral_length: 1024,
            max_buyer_offers: 2,
            add_contract_controller_delay: 3_600,
            max_neurons_allowed: 5,
            max_subaccounts_allowed: 5,
            warning_cycles_threshold_percentage: 30,
            critical_cycles_threshold_percentage: 10,
        }
    }
}

#[macro_export]
macro_rules! result_err_matches {
    ($expression:expr, $pattern:pat $(if $guard:expr)? $(,)?) => {
        assert!(matches!($expression, Result::Err($pattern) $(if $guard)?));
    };
}

#[macro_export]
macro_rules! result_ok_with_holder_information {
    ($expression:expr) => {
        match $expression {
            Ok(contract_canister_api::process_holder::ProcessHolderResult {
                holder_information,
            }) => holder_information,
            Err(e) => panic!("Error: {:?}", e),
        }
    };
}

#[macro_export]
macro_rules! test_state_matches {
    ($pattern:pat $(if $guard:expr)? $(,)?) => {
        $crate::handlers::holder::states::get_holder_model(|_, model| {
            assert!(matches!(
                &model.state.value,
                $pattern $(if $guard)?
            ));
        });
    };
}

#[macro_export]
macro_rules! test_state_extract_neuron_hotkeys {
    () => {
        $crate::handlers::holder::states::get_holder_model(|_, model| match &model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::FetchAssets {
                        fetch_assets_state:
                            FetchAssetsState::FetchIdentityAccountsNnsAssetsState {
                                sub_state:
                                    FetchIdentityAccountsNnsAssetsState::FetchNnsAssetsState {
                                        sub_state,
                                        ..
                                    },
                            },
                        ..
                    },
            } => match sub_state {
                FetchNnsAssetsState::DeletingNeuronsHotkeys { neuron_hotkeys }
                | FetchNnsAssetsState::GetNeuronsInformation { neuron_hotkeys } => {
                    neuron_hotkeys.clone()
                }
                _ => panic!("Invalid state for extracting neuron hot keys"),
            },
            _ => panic!("Invalid state for extracting neuron hot keys"),
        })
    };
}

#[macro_export]
macro_rules! processing_err_matches {
    ($pattern:pat $(if $guard:expr)? $(,)?) => {
        $crate::handlers::holder::states::get_holder_model(|_, model| {
            assert!(matches!(
                model.processing_error,
                Some(Timestamped { value: $pattern $(if $guard)?, ..})
            ));
        });
    };
}

#[macro_export]
macro_rules! print_holder_state {
    () => {
        $crate::handlers::holder::states::get_holder_model(|_state, model| {
            println!("Current holder state: {:?}", model.state.value);
        });
    };
}
