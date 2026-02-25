use common_canister_impl::components::identity::api::{
    AuthnMethodConfirmationError, AuthnMethodRegistrationModeExitError,
};
use common_canister_types::Timestamped;
use contract_canister_api::{
    confirm_owner_authn_method_registration::{
        ConfirmOwnerAuthnMethodRegistrationArgs, ConfirmOwnerAuthnMethodRegistrationError,
    },
    restart_release_identity::RestartReleaseIdentityError,
    start_release_identity::StartReleaseIdentityError,
    types::holder::{
        CheckAssetsState, ConfirmAuthnMethodRegistrationError, FetchAssetsState,
        HolderProcessingError, HolderState, HoldingState, ReleaseError, ReleaseInitiation,
        ReleaseState, SaleDealState, UnsellableReason,
    },
};

use crate::{
    handlers::holder::states::{
        enter_authn_method_registration_mode::generate_random_string, get_holder_model,
    },
    processing_err_matches, result_err_matches, result_ok_with_holder_information,
    test::tests::{
        components::{
            ic::set_test_caller, identity::set_test_additional_auth, time::set_test_time,
        },
        drivers::{
            fetch::{drive_to_finish_fetch_assets, drive_to_hold, FetchConfig},
            hold::drive_after_quarantine,
        },
        ht_get_test_deployer, ht_get_test_hub_canister,
        sale::ht_set_sale_intentions,
        support::mocks::{
            mock_authn_method_confirm_err, mock_authn_method_confirm_ok,
            mock_authn_method_registration_mode_enter_ok,
            mock_authn_method_registration_mode_exit_ret_err,
            mock_authn_method_registration_mode_exit_ret_ok, mock_authn_method_remove_err,
            mock_authn_method_remove_ok,
        },
        tick_n, HT_CAPTURED_IDENTITY_NUMBER, HT_QUARANTINE_DURATION,
        HT_SALE_DEAL_SAFE_CLOSE_DURATION, HT_STANDARD_CERT_EXPIRATION,
        TEST_RELEASE_EXPIRATION_MILLIS, TEST_RELEASE_EXPIRATION_NANOS,
        TEST_RELEASE_REGISTRATION_ID, TEST_RELEASING_IDENTITY_NUMBER,
    },
    test_state_matches,
    updates::holder::{
        confirm_owner_authn_method_registration::confirm_owner_authn_method_registration_int,
        delete_holder_authn_method::delete_holder_authn_method_int,
        restart_release_identity::restart_release_identity_int,
        start_release_identity::start_release_identity_int,
    },
};

#[tokio::test]
async fn test_releasing_happy_path() {
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        TEST_RELEASING_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    // call owner
    set_test_caller(ht_get_test_deployer());
    happy_path_release(TEST_RELEASING_IDENTITY_NUMBER, None).await;
}

async fn happy_path_release(
    test_identity_number: u64,
    unsellable_reason_opt: Option<UnsellableReason>,
) {
    let result = start_release_identity_int().await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(test_identity_number)
    );
    assert_eq!(
        holder_information.state,
        HolderState::Release {
            release_initiation: ReleaseInitiation::Manual {
                unsellable_reason: unsellable_reason_opt.clone()
            },
            sub_state: ReleaseState::StartRelease,
        }
    );

    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnterAuthnMethodRegistrationMode {
            registration_id: None
        },
        ..
    });

    mock_authn_method_registration_mode_enter_ok(TEST_RELEASE_EXPIRATION_NANOS);
    super::tick().await;
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Release {
            sub_state:
                ReleaseState::WaitingAuthnMethodRegistration {
                    expiration,
                    registration_id,
                    confirm_error: None,
                },
            ..
        } => {
            assert_eq!(*expiration, TEST_RELEASE_EXPIRATION_MILLIS);
            assert_eq!(registration_id, TEST_RELEASE_REGISTRATION_ID);
        }
        _ => panic!(
            "Expected WaitingAuthnMethodRegistration state, {:?}",
            model.state.value
        ),
    });

    // check code
    let code = "1248".to_string();
    let result =
        confirm_owner_authn_method_registration_int(ConfirmOwnerAuthnMethodRegistrationArgs {
            verification_code: code.clone(),
        })
        .await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(test_identity_number)
    );
    crate::handlers::holder::states::get_holder_model(|_, model| match &model.state.value {
        HolderState::Release {
            sub_state:
                ReleaseState::ConfirmAuthnMethodRegistration {
                    verification_code, ..
                },
            ..
        } => assert_eq!(verification_code, &code),
        _ => panic!(
            "Expected ConfirmAuthnMethodRegistration state, {:?}",
            model.state.value
        ),
    });

    mock_authn_method_confirm_ok();
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::CheckingAccessFromOwnerAuthnMethod,
        ..
    });

    let result = delete_holder_authn_method_int().await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(test_identity_number)
    );
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::DeleteHolderAuthnMethod,
        ..
    });

    // add ecsda key
    get_holder_model(|_, model| {
        set_test_additional_auth(model.get_ecdsa_as_uncompressed_public_key());
    });
    mock_authn_method_remove_ok();
    super::tick().await;
    test_state_matches!(HolderState::Closed {
        unsellable_reason
    } if unsellable_reason == &unsellable_reason_opt);
}

// ---------------------------------------------------------------------------
// Shared helper for releasing tests
// ---------------------------------------------------------------------------

/// Drives the state machine from fresh init all the way to
/// `ReleaseState::WaitingAuthnMethodRegistration { confirm_error: None }`.
///
/// Steps:
/// 1. `drive_to_hold` with `HT_STANDARD_CERT_EXPIRATION` and `identity_number`
/// 2. `set_test_caller(deployer)` + `start_release_identity_int()`
/// 3. tick: `StartRelease` → `EnterAuthnMethodRegistrationMode`
/// 4. `mock_authn_method_registration_mode_enter_ok(TEST_RELEASE_EXPIRATION_NANOS)` + tick
///    → `WaitingAuthnMethodRegistration { confirm_error: None }`
///
/// **Postcondition:** state is `WaitingAuthnMethodRegistration`.
async fn drive_to_waiting_authn_registration(identity_number: u64) {
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        identity_number,
        &FetchConfig::single_no_neurons(),
    )
    .await;
    set_test_caller(ht_get_test_deployer());
    start_release_identity_int()
        .await
        .expect("drive_to_waiting_authn_registration: start_release_identity_int failed");
    // StartRelease → EnterAuthnMethodRegistrationMode
    super::tick().await;
    mock_authn_method_registration_mode_enter_ok(TEST_RELEASE_EXPIRATION_NANOS);
    // EnterAuthnMethodRegistrationMode → WaitingAuthnMethodRegistration
    super::tick().await;
}

// ---------------------------------------------------------------------------
// test_releasing_permission_denied_and_expiration
// ---------------------------------------------------------------------------

/// Tests:
/// - `start_release_identity_int` from wrong caller → `PermissionDenied`
/// - Registration mode entered → expires → `ReleaseFailed::AuthnMethodRegistrationExpired`
/// - `restart_release_identity_int` from wrong caller → `PermissionDenied`
/// - `restart_release_identity_int` from correct caller → back to `EnterAuthnMethodRegistrationMode`
#[tokio::test]
async fn test_releasing_permission_denied_and_expiration() {
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        TEST_RELEASING_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    // Wrong caller → PermissionDenied
    set_test_caller(ht_get_test_hub_canister());
    let result = start_release_identity_int().await;
    result_err_matches!(result, StartReleaseIdentityError::PermissionDenied);

    // Correct caller → StartRelease
    set_test_caller(ht_get_test_deployer());
    let result = start_release_identity_int().await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(TEST_RELEASING_IDENTITY_NUMBER)
    );
    assert_eq!(
        holder_information.state,
        HolderState::Release {
            release_initiation: ReleaseInitiation::Manual {
                unsellable_reason: None
            },
            sub_state: ReleaseState::StartRelease,
        }
    );

    // StartRelease → EnterAuthnMethodRegistrationMode
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnterAuthnMethodRegistrationMode {
            registration_id: None
        },
        ..
    });

    // EnterAuthnMethodRegistrationMode → WaitingAuthnMethodRegistration
    mock_authn_method_registration_mode_enter_ok(TEST_RELEASE_EXPIRATION_NANOS);
    super::tick().await;
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Release {
            sub_state:
                ReleaseState::WaitingAuthnMethodRegistration {
                    expiration,
                    registration_id,
                    confirm_error: None,
                },
            ..
        } => {
            assert_eq!(*expiration, TEST_RELEASE_EXPIRATION_MILLIS);
            assert_eq!(registration_id, TEST_RELEASE_REGISTRATION_ID);
        }
        _ => panic!(
            "Expected WaitingAuthnMethodRegistration, got: {:?}",
            model.state.value
        ),
    });

    // Advance time past expiration → ReleaseFailed::AuthnMethodRegistrationExpired
    set_test_time(TEST_RELEASE_EXPIRATION_MILLIS + 1);
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::ReleaseFailed {
            error: ReleaseError::AuthnMethodRegistrationExpired
        },
        ..
    });

    // Restart: wrong caller → PermissionDenied
    set_test_caller(ht_get_test_hub_canister());
    let result = restart_release_identity_int(None).await;
    result_err_matches!(result, RestartReleaseIdentityError::PermissionDenied);

    // Restart: correct caller → back to EnterAuthnMethodRegistrationMode
    set_test_caller(ht_get_test_deployer());
    let result = restart_release_identity_int(None).await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(TEST_RELEASING_IDENTITY_NUMBER)
    );
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnterAuthnMethodRegistrationMode {
            registration_id: None
        },
        ..
    });
}

// ---------------------------------------------------------------------------
// test_releasing_premature_restart_during_waiting
// ---------------------------------------------------------------------------

/// Tests restarting the release flow while still in `WaitingAuthnMethodRegistration`
/// (with a `confirm_error` present after a wrong-code attempt).
///
/// The premature restart transitions to `EnsureOrphanedRegistrationExited`, and after
/// a successful exit response the state returns to `EnterAuthnMethodRegistrationMode`.
#[tokio::test]
async fn test_releasing_premature_restart_during_waiting() {
    drive_to_waiting_authn_registration(TEST_RELEASING_IDENTITY_NUMBER).await;

    // Confirm with wrong code → ConfirmAuthnMethodRegistration
    let wrong_code = "1234".to_string();

    // Wrong caller for confirm
    set_test_caller(ht_get_test_hub_canister());
    let result =
        confirm_owner_authn_method_registration_int(ConfirmOwnerAuthnMethodRegistrationArgs {
            verification_code: wrong_code.clone(),
        })
        .await;
    result_err_matches!(
        result,
        ConfirmOwnerAuthnMethodRegistrationError::PermissionDenied
    );

    // Correct caller
    set_test_caller(ht_get_test_deployer());
    let result =
        confirm_owner_authn_method_registration_int(ConfirmOwnerAuthnMethodRegistrationArgs {
            verification_code: wrong_code.clone(),
        })
        .await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(TEST_RELEASING_IDENTITY_NUMBER)
    );
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Release {
            sub_state:
                ReleaseState::ConfirmAuthnMethodRegistration {
                    verification_code, ..
                },
            ..
        } => assert_eq!(verification_code, &wrong_code),
        _ => panic!(
            "Expected ConfirmAuthnMethodRegistration, got: {:?}",
            model.state.value
        ),
    });

    // WrongCode response → back to WaitingAuthnMethodRegistration with confirm_error
    mock_authn_method_confirm_err(AuthnMethodConfirmationError::WrongCode { retries_left: 3 });
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::WaitingAuthnMethodRegistration {
            confirm_error: Some(ConfirmAuthnMethodRegistrationError { .. }),
            ..
        },
        ..
    });

    // Premature restart: wrong caller → PermissionDenied
    set_test_caller(ht_get_test_hub_canister());
    let result = restart_release_identity_int(None).await;
    result_err_matches!(result, RestartReleaseIdentityError::PermissionDenied);

    // Premature restart: correct caller → EnsureOrphanedRegistrationExited
    set_test_caller(ht_get_test_deployer());
    let result = restart_release_identity_int(None).await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(TEST_RELEASING_IDENTITY_NUMBER)
    );
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnsureOrphanedRegistrationExited {
            registration_id: None
        },
        ..
    });

    // Exit succeeds → EnterAuthnMethodRegistrationMode
    mock_authn_method_registration_mode_exit_ret_ok();
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnterAuthnMethodRegistrationMode {
            registration_id: None
        },
        ..
    });
}

// ---------------------------------------------------------------------------
// test_releasing_delete_fails_no_ecdsa_and_restart
// ---------------------------------------------------------------------------

/// Tests the path where `DeleteHolderAuthnMethod` fails because the owner authn
/// method is not registered (no ECDSA key added before the tick).
///
/// After the failure:
/// - restart → `EnsureOrphanedRegistrationExited`
/// - exit with `InternalCanisterError` → back to `EnterAuthnMethodRegistrationMode`
#[tokio::test]
async fn test_releasing_delete_fails_no_ecdsa_and_restart() {
    drive_to_waiting_authn_registration(TEST_RELEASING_IDENTITY_NUMBER).await;

    // Wrong code confirm → WaitingAuthnMethodRegistration with error
    let wrong_code = "1234".to_string();
    set_test_caller(ht_get_test_deployer());
    confirm_owner_authn_method_registration_int(ConfirmOwnerAuthnMethodRegistrationArgs {
        verification_code: wrong_code,
    })
    .await
    .expect("confirm (wrong code) failed");
    mock_authn_method_confirm_err(AuthnMethodConfirmationError::WrongCode { retries_left: 3 });
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::WaitingAuthnMethodRegistration {
            confirm_error: Some(ConfirmAuthnMethodRegistrationError { .. }),
            ..
        },
        ..
    });

    // Correct code confirm → ConfirmAuthnMethodRegistration → CheckingAccessFromOwnerAuthnMethod
    let correct_code = "1248".to_string();
    let result =
        confirm_owner_authn_method_registration_int(ConfirmOwnerAuthnMethodRegistrationArgs {
            verification_code: correct_code.clone(),
        })
        .await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(TEST_RELEASING_IDENTITY_NUMBER)
    );
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Release {
            sub_state:
                ReleaseState::ConfirmAuthnMethodRegistration {
                    verification_code, ..
                },
            ..
        } => assert_eq!(verification_code, &correct_code),
        _ => panic!(
            "Expected ConfirmAuthnMethodRegistration, got: {:?}",
            model.state.value
        ),
    });

    mock_authn_method_confirm_ok();
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::CheckingAccessFromOwnerAuthnMethod,
        ..
    });

    // Delete holder authn method → DeleteHolderAuthnMethod
    let result = delete_holder_authn_method_int().await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(TEST_RELEASING_IDENTITY_NUMBER)
    );
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::DeleteHolderAuthnMethod,
        ..
    });

    // Tick WITHOUT adding ECDSA key → owner authn method not registered
    // → ReleaseFailed::HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::ReleaseFailed {
            error: ReleaseError::HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered
        },
        ..
    });

    // Restart from ReleaseFailed → EnsureOrphanedRegistrationExited
    let result = restart_release_identity_int(None).await;
    assert!(result.is_ok());
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnsureOrphanedRegistrationExited {
            registration_id: None
        },
        ..
    });

    // Exit fails with InternalCanisterError → back to EnterAuthnMethodRegistrationMode
    mock_authn_method_registration_mode_exit_ret_err(
        AuthnMethodRegistrationModeExitError::InternalCanisterError("ss".to_owned()),
    );
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnterAuthnMethodRegistrationMode {
            registration_id: None
        },
        ..
    });
}

// ---------------------------------------------------------------------------
// test_releasing_remove_fails_with_processing_error_then_recovery
// ---------------------------------------------------------------------------

/// Tests the path where `authn_method_remove` returns an error after the ECDSA
/// key has been added, producing a `HolderProcessingError::InternalError`.
///
/// After the processing error the state remains in `DeleteHolderAuthnMethod`.
/// A subsequent tick with `mock_authn_method_remove_ok` completes the release → `Closed`.
#[tokio::test]
async fn test_releasing_remove_fails_with_processing_error_then_recovery() {
    drive_to_waiting_authn_registration(TEST_RELEASING_IDENTITY_NUMBER).await;

    // Wrong code confirm first
    let wrong_code = "1234".to_string();
    set_test_caller(ht_get_test_deployer());
    confirm_owner_authn_method_registration_int(ConfirmOwnerAuthnMethodRegistrationArgs {
        verification_code: wrong_code,
    })
    .await
    .expect("confirm (wrong code) failed");
    mock_authn_method_confirm_err(AuthnMethodConfirmationError::WrongCode { retries_left: 3 });
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::WaitingAuthnMethodRegistration {
            confirm_error: Some(ConfirmAuthnMethodRegistrationError { .. }),
            ..
        },
        ..
    });

    // Correct code confirm → through to DeleteHolderAuthnMethod
    let correct_code = "1248".to_string();
    let result =
        confirm_owner_authn_method_registration_int(ConfirmOwnerAuthnMethodRegistrationArgs {
            verification_code: correct_code.clone(),
        })
        .await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(TEST_RELEASING_IDENTITY_NUMBER)
    );

    mock_authn_method_confirm_ok();
    super::tick().await; // → CheckingAccessFromOwnerAuthnMethod
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::CheckingAccessFromOwnerAuthnMethod,
        ..
    });

    let result = delete_holder_authn_method_int().await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(TEST_RELEASING_IDENTITY_NUMBER)
    );
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::DeleteHolderAuthnMethod,
        ..
    });

    // Add ECDSA key but mock remove failure → InternalError processing error
    get_holder_model(|_, model| {
        set_test_additional_auth(model.get_ecdsa_as_uncompressed_public_key());
    });
    mock_authn_method_remove_err();
    super::tick().await;
    // State stays at DeleteHolderAuthnMethod, with a processing error attached
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::DeleteHolderAuthnMethod,
        ..
    });
    processing_err_matches!(HolderProcessingError::InternalError { .. });

    // Recovery: re-add ECDSA key (set_test_additional_auth is consumed per tick)
    // and retry with remove_ok → Closed
    get_holder_model(|_, model| {
        set_test_additional_auth(model.get_ecdsa_as_uncompressed_public_key());
    });
    mock_authn_method_remove_ok();
    super::tick().await;
    test_state_matches!(HolderState::Closed {
        unsellable_reason: None
    });
}

#[tokio::test]
async fn test_releasing_after_quarantine() {
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        TEST_RELEASING_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    // END OF QUARANTINE
    drive_after_quarantine(&FetchConfig::single_no_neurons()).await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: None,
        }
    });

    set_test_caller(ht_get_test_deployer());
    happy_path_release(TEST_RELEASING_IDENTITY_NUMBER, None).await;
}

#[tokio::test]
async fn test_releasing_in_unsellable_mode() {
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        TEST_RELEASING_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    // END OF QUARANTINE
    drive_after_quarantine(&FetchConfig::single_no_neurons()).await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: None,
        }
    });

    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Unsellable {
            reason: UnsellableReason::CertificateExpired
        }
    });

    set_test_caller(ht_get_test_deployer());
    happy_path_release(
        TEST_RELEASING_IDENTITY_NUMBER,
        Some(UnsellableReason::CertificateExpired),
    )
    .await;
}

#[tokio::test]
async fn test_releasing_in_sale_without_sale_offer() {
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        TEST_RELEASING_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    // Set sale intention (transitions to WaitingSellOffer)
    ht_set_sale_intentions(ht_get_test_deployer()).await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: Some(SaleDealState::WaitingSellOffer),
        }
    });

    happy_path_release(TEST_RELEASING_IDENTITY_NUMBER, None).await;
}

#[tokio::test]
async fn test_releasing_with_failed_confirmation() {
    drive_to_waiting_authn_registration(TEST_RELEASING_IDENTITY_NUMBER).await;

    // state is already WaitingAuthnMethodRegistration — verify it
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::WaitingAuthnMethodRegistration {
            confirm_error: None,
            ..
        },
        ..
    });

    // Attempt with wrong code
    let wrong_code = "9999".to_string();
    let result =
        confirm_owner_authn_method_registration_int(ConfirmOwnerAuthnMethodRegistrationArgs {
            verification_code: wrong_code.clone(),
        })
        .await;
    result_ok_with_holder_information!(result);

    // Set response to indicate wrong code
    mock_authn_method_confirm_err(AuthnMethodConfirmationError::WrongCode { retries_left: 2 });
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::WaitingAuthnMethodRegistration {
            confirm_error: Some(ConfirmAuthnMethodRegistrationError { .. }),
            ..
        },
        ..
    });

    // Now try with correct code
    let correct_code = "1248".to_string();
    let result =
        confirm_owner_authn_method_registration_int(ConfirmOwnerAuthnMethodRegistrationArgs {
            verification_code: correct_code.clone(),
        })
        .await;
    result_ok_with_holder_information!(result);

    mock_authn_method_confirm_ok();
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::CheckingAccessFromOwnerAuthnMethod,
        ..
    });

    // Complete the release process
    let result = delete_holder_authn_method_int().await;
    result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::DeleteHolderAuthnMethod,
        ..
    });

    // Add ECDSA key and complete the process
    get_holder_model(|_, model| {
        set_test_additional_auth(model.get_ecdsa_as_uncompressed_public_key());
    });
    mock_authn_method_remove_ok();
    super::tick().await;
    test_state_matches!(HolderState::Closed {
        unsellable_reason: None
    });
}

#[tokio::test]
async fn test_release_when_fetch_assets() {
    let owner = ht_get_test_deployer();
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    set_test_time(HT_QUARANTINE_DURATION + 1);
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::StartFetchAssets,
            ..
        }
    });

    set_test_caller(owner);
    let result = start_release_identity_int().await;
    assert!(result.is_ok());
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::StartRelease,
        release_initiation: ReleaseInitiation::Manual {
            unsellable_reason: None
        },
    });
}

#[tokio::test]
async fn test_release_when_check_assets() {
    let owner = ht_get_test_deployer();
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    set_test_time(HT_QUARANTINE_DURATION + 1);
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::StartFetchAssets,
            ..
        }
    });

    drive_to_finish_fetch_assets(&FetchConfig::single_no_neurons()).await;

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::StartCheckAssets,
            ..
        }
    });

    set_test_caller(owner);
    let result = start_release_identity_int().await;
    assert!(result.is_ok());
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::StartRelease,
        release_initiation: ReleaseInitiation::Manual {
            unsellable_reason: None
        },
    });
}

#[tokio::test]
async fn test_release_when_validate_assets() {
    let owner = ht_get_test_deployer();
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    set_test_time(HT_QUARANTINE_DURATION + 1);
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::StartFetchAssets,
            ..
        }
    });

    drive_to_finish_fetch_assets(&FetchConfig::single_no_neurons()).await;

    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::StartCheckAssets,
            ..
        }
    });

    // Advance through the check-assets sub-steps:
    //   tick 1: StartCheckAssets → CheckAccountsForNoApprovePrepare
    //   tick 2‥6: sequential sub-account checks (HT_SEQUENTIAL_CHECK_STEPS = 4 iterations + 1)
    //   tick 7: FinishCheckAssets
    //   tick 8: FinishCheckAssets → ValidateAssets
    tick_n(8).await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::ValidateAssets { .. },
    });

    set_test_caller(owner);
    let result = start_release_identity_int().await;
    assert!(result.is_ok());
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::StartRelease,
        release_initiation: ReleaseInitiation::Manual {
            unsellable_reason: None
        },
    });
}

#[test]
fn test_generate_random_string() {
    let dictionary = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let random = vec![0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    let result = generate_random_string(5, random.clone(), dictionary);
    assert_eq!(result.len(), 5);

    // Ensure all characters in the result are from the dictionary
    for c in result.chars() {
        assert!(dictionary.contains(c));
    }

    // Test with a different random vector
    let random = vec![10, 20, 30, 40, 50];
    let result = generate_random_string(5, random.clone(), dictionary);
    assert_eq!(result.len(), 5);

    for c in result.chars() {
        assert!(dictionary.contains(c));
    }
}
