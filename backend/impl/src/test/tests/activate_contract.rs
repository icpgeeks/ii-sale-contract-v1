use candid::Principal;
use common_canister_types::TimestampMillis;
use common_contract_api::{
    activate_contract::{ActivateContractArgs, ActivateContractError, CheckPermissionStrategy},
    get_contract_owner::GetContractOwnerError,
};
use contract_canister_api::types::holder::HolderState;

use crate::{
    handlers::{
        cycles_calculator::get_cycles_calculator, holder::build_holder_information_with_load,
    },
    result_err_matches,
    test::tests::{
        components::ic::{ht_set_test_cycles, set_test_caller},
        ht_get_test_deployer, ht_init_test_contract,
    },
    test_state_matches,
    updates::contract::{
        activate_contract::activate_contract_int, get_contract_owner::get_contract_owner_int,
    },
};

pub(crate) async fn ht_init_and_activate_contract(
    certificate_expiration: TimestampMillis,
    contract_owner: Principal,
) {
    ht_init_test_contract(certificate_expiration, None);
    set_test_caller(ht_get_test_deployer());

    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckCallerIsDeployer,
        contract_owner,
    })
    .await;
    assert!(result.is_ok());
}

pub(crate) async fn ht_activate_contract(contract_owner: Principal) {
    set_test_caller(ht_get_test_deployer());

    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckCallerIsDeployer,
        contract_owner,
    })
    .await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_activate_contract_by_deployer() {
    ht_init_test_contract(60_000, None);

    let contract_owner = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

    result_err_matches!(
        get_contract_owner_int(),
        GetContractOwnerError::ContractNotActivated
    );

    // fail for anonymous
    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckCallerIsDeployer,
        contract_owner,
    })
    .await;
    result_err_matches!(result, ActivateContractError::ValidationFailed { .. });

    set_test_caller(ht_get_test_deployer());

    // fail for code strategy
    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckContractActivationCode {
            code: "qwerty".to_owned(),
        },
        contract_owner,
    })
    .await;
    result_err_matches!(result, ActivateContractError::ValidationFailed { .. });

    // ok
    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckCallerIsDeployer,
        contract_owner,
    })
    .await;
    assert!(result.is_ok());
    assert_eq!(get_contract_owner_int().unwrap().owner, contract_owner);

    // fail double activation
    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckCallerIsDeployer,
        contract_owner,
    })
    .await;
    result_err_matches!(result, ActivateContractError::AlreadyActivated { .. });

    // check state
    test_state_matches!(HolderState::WaitingStartCapture { .. });
}

#[tokio::test]
async fn test_activate_contract_by_code() {
    ht_init_test_contract(
        60_000,
        Some(vec![
            101, 232, 75, 227, 53, 50, 251, 120, 76, 72, 18, 150, 117, 249, 239, 243, 166, 130,
            178, 113, 104, 192, 234, 116, 75, 44, 245, 142, 224, 35, 55, 197,
        ]),
    );

    let contract_owner = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

    result_err_matches!(
        get_contract_owner_int(),
        GetContractOwnerError::ContractNotActivated
    );

    // fail for anonymous
    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckCallerIsDeployer,
        contract_owner,
    })
    .await;
    result_err_matches!(result, ActivateContractError::ValidationFailed { .. });

    set_test_caller(ht_get_test_deployer());

    // fail for deployer strategy
    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckCallerIsDeployer,
        contract_owner,
    })
    .await;
    result_err_matches!(result, ActivateContractError::ValidationFailed { .. });

    // fail for wrong code
    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckContractActivationCode {
            code: "aaa".to_owned(),
        },
        contract_owner,
    })
    .await;
    result_err_matches!(result, ActivateContractError::ValidationFailed { .. });

    // ok
    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckContractActivationCode {
            code: "qwerty".to_owned(),
        },
        contract_owner,
    })
    .await;
    assert!(result.is_ok());
    assert_eq!(get_contract_owner_int().unwrap().owner, contract_owner);

    // fail double activation
    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckContractActivationCode {
            code: "qwerty".to_owned(),
        },
        contract_owner,
    })
    .await;
    result_err_matches!(result, ActivateContractError::AlreadyActivated { .. });
}

#[tokio::test]
async fn test_check_cycles_warning() {
    ht_init_test_contract(
        60_000,
        Some(vec![
            101, 232, 75, 227, 53, 50, 251, 120, 76, 72, 18, 150, 117, 249, 239, 243, 166, 130,
            178, 113, 104, 192, 234, 116, 75, 44, 245, 142, 224, 35, 55, 197,
        ]),
    );

    let contract_owner = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

    set_test_caller(ht_get_test_deployer());

    // ok
    let result = activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckContractActivationCode {
            code: "qwerty".to_owned(),
        },
        contract_owner,
    })
    .await;
    assert!(result.is_ok());
    assert_eq!(get_contract_owner_int().unwrap().owner, contract_owner);

    let holder_information = build_holder_information_with_load();
    assert!(
        holder_information
            .canister_cycles_state
            .critical_threshold_cycles
            < holder_information.canister_cycles_state.current_cycles
    );
    assert!(!get_cycles_calculator().is_critical_cycles_level());

    ht_set_test_cycles(
        holder_information
            .canister_cycles_state
            .critical_threshold_cycles
            + 1,
    );
    let holder_information = build_holder_information_with_load();
    assert!(
        holder_information
            .canister_cycles_state
            .critical_threshold_cycles
            + 1
            == holder_information.canister_cycles_state.current_cycles
    );
    assert!(!get_cycles_calculator().is_critical_cycles_level());
    ht_set_test_cycles(get_cycles_calculator().get_cycles_state().current_cycles - 1);
    assert!(get_cycles_calculator().is_critical_cycles_level());
}
