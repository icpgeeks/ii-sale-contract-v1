use common_canister_impl::components::identity::api::{
    AuthnMethodConfirmationError, AuthnMethodRegistrationModeExitError,
};
use common_canister_types::{nanos_to_millis, LedgerAccount, Timestamped};
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
        support::mocks::{
            mock_authn_method_confirm_err, mock_authn_method_confirm_ok,
            mock_authn_method_registration_mode_enter_ok,
            mock_authn_method_registration_mode_exit_ret_err,
            mock_authn_method_registration_mode_exit_ret_ok, mock_authn_method_remove_err,
            mock_authn_method_remove_ok,
        },
        HT_CAPTURED_IDENTITY_NUMBER, HT_QUARANTINE_DURATION, HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        HT_STANDARD_CERT_EXPIRATION, TEST_RELEASE_EXPIRATION_NANOS, TEST_RELEASE_REGISTRATION_ID,
    },
    test_state_matches,
    updates::holder::{
        confirm_owner_authn_method_registration::confirm_owner_authn_method_registration_int,
        delete_holder_authn_method::delete_holder_authn_method_int,
        restart_release_identity::restart_release_identity_int,
        set_sale_intention::set_sale_intention_int,
        start_release_identity::start_release_identity_int,
    },
};

#[tokio::test]
async fn test_releasing_happy_path() {
    let test_identity_number = 778;
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        test_identity_number,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    // call owner
    set_test_caller(ht_get_test_deployer());
    happy_path_release(test_identity_number, None).await;
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

    let expiration_provided = TEST_RELEASE_EXPIRATION_NANOS;
    let expiration_provided_millis = nanos_to_millis(&(expiration_provided as u128));
    mock_authn_method_registration_mode_enter_ok(expiration_provided);
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
            assert_eq!(*expiration, expiration_provided_millis);
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

#[tokio::test]
async fn test_releasing() {
    let test_identity_number = 777;
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        test_identity_number,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    // call wrong owner
    set_test_caller(ht_get_test_hub_canister());
    let result = start_release_identity_int().await;
    result_err_matches!(result, StartReleaseIdentityError::PermissionDenied);

    // call owner
    set_test_caller(ht_get_test_deployer());
    let result = start_release_identity_int().await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(holder_information.identity_number, Some(777));
    assert_eq!(
        holder_information.state,
        HolderState::Release {
            release_initiation: ReleaseInitiation::Manual {
                unsellable_reason: None
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

    let expiration_provided = TEST_RELEASE_EXPIRATION_NANOS;
    let expiration_provided_millis = nanos_to_millis(&(expiration_provided as u128));
    mock_authn_method_registration_mode_enter_ok(expiration_provided);
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
            assert_eq!(*expiration, expiration_provided_millis);
            assert_eq!(registration_id, TEST_RELEASE_REGISTRATION_ID);
        }
        _ => panic!(
            "Expected WaitingAuthnMethodRegistration state, {:?}",
            model.state.value
        ),
    });
    // emulate expiration
    set_test_time(expiration_provided_millis + 1);
    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::ReleaseFailed {
            error: ReleaseError::AuthnMethodRegistrationExpired
        },
        ..
    });

    // restart release
    // call wrong owner
    set_test_caller(ht_get_test_hub_canister());
    let result = restart_release_identity_int(None).await;
    result_err_matches!(result, RestartReleaseIdentityError::PermissionDenied);

    set_test_caller(ht_get_test_deployer());
    let result = restart_release_identity_int(None).await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(test_identity_number)
    );
    let mut pass = 1;
    loop {
        test_state_matches!(HolderState::Release {
            sub_state: ReleaseState::EnterAuthnMethodRegistrationMode {
                registration_id: None
            },
            ..
        });
        mock_authn_method_registration_mode_enter_ok(expiration_provided);
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
                assert_eq!(*expiration, expiration_provided_millis);
                assert_eq!(registration_id, TEST_RELEASE_REGISTRATION_ID);
            }
            _ => panic!(
                "Expected WaitingAuthnMethodRegistration state, {:?}",
                model.state.value
            ),
        });

        // check code
        let code = "1234".to_string();
        let confirm_args = ConfirmOwnerAuthnMethodRegistrationArgs {
            verification_code: code.clone(),
        };
        // call wrong owner
        set_test_caller(ht_get_test_hub_canister());
        let result = confirm_owner_authn_method_registration_int(confirm_args.clone()).await;
        result_err_matches!(
            result,
            ConfirmOwnerAuthnMethodRegistrationError::PermissionDenied
        );

        set_test_caller(ht_get_test_deployer());
        let result = confirm_owner_authn_method_registration_int(confirm_args).await;
        let holder_information = result_ok_with_holder_information!(result);
        assert_eq!(
            holder_information.identity_number,
            Some(test_identity_number)
        );
        get_holder_model(|_, model| match &model.state.value {
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

        mock_authn_method_confirm_err(AuthnMethodConfirmationError::WrongCode { retries_left: 3 });
        super::tick().await;
        test_state_matches!(HolderState::Release {
            sub_state: ReleaseState::WaitingAuthnMethodRegistration {
                confirm_error: Some(ConfirmAuthnMethodRegistrationError { .. }),
                ..
            },
            ..
        });

        if pass == 1 {
            // restart prematurely
            let result = restart_release_identity_int(None).await;
            let holder_information = result_ok_with_holder_information!(result);
            assert_eq!(
                holder_information.identity_number,
                Some(test_identity_number)
            );
            test_state_matches!(HolderState::Release {
                sub_state: ReleaseState::EnsureOrphanedRegistrationExited {
                    registration_id: None
                },
                ..
            });

            mock_authn_method_registration_mode_exit_ret_ok();
            super::tick().await;
            pass += 1;
            continue;
        }

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
        get_holder_model(|_, model| match &model.state.value {
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

        if pass == 3 {
            // add ecsda key
            get_holder_model(|_, model| {
                set_test_additional_auth(model.get_ecdsa_as_uncompressed_public_key());
            });
            mock_authn_method_remove_err();
        }
        super::tick().await;
        if pass == 2 {
            test_state_matches!(HolderState::Release {
                sub_state: ReleaseState::ReleaseFailed {
                    error: ReleaseError::HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered
                },
                ..
            });

            let result = restart_release_identity_int(None).await;
            assert!(result.is_ok());

            test_state_matches!(HolderState::Release {
                sub_state: ReleaseState::EnsureOrphanedRegistrationExited {
                    registration_id: None
                },
                ..
            });

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
            pass += 1;
            continue;
        } else {
            test_state_matches!(HolderState::Release {
                sub_state: ReleaseState::DeleteHolderAuthnMethod,
                ..
            });
            processing_err_matches!(HolderProcessingError::InternalError { .. });
        }
        break;
    }

    // add ecsda key
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
    let test_identity_number = 779;
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        test_identity_number,
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
    happy_path_release(test_identity_number, None).await;
}

#[tokio::test]
async fn test_releasing_in_unsellable_mode() {
    let test_identity_number = 779;
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        test_identity_number,
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
        test_identity_number,
        Some(UnsellableReason::CertificateExpired),
    )
    .await;
}

#[tokio::test]
async fn test_releasing_in_sale_without_sale_offer() {
    let test_identity_number = 779;
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        test_identity_number,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    // call prepare sale
    set_test_caller(ht_get_test_deployer());
    let _ = set_sale_intention_int(LedgerAccount::Account {
        owner: ht_get_test_deployer(),
        subaccount: None,
    })
    .await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: Some(HT_QUARANTINE_DURATION),
            sale_deal_state: Some(SaleDealState::WaitingSellOffer),
        }
    });

    happy_path_release(test_identity_number, None).await;
}

#[tokio::test]
async fn test_releasing_with_failed_confirmation() {
    let test_identity_number = 780;
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        ht_get_test_deployer(),
        test_identity_number,
        &FetchConfig::single_no_neurons(),
    )
    .await;

    // call owner
    set_test_caller(ht_get_test_deployer());
    let result = start_release_identity_int().await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(
        holder_information.identity_number,
        Some(test_identity_number)
    );
    test_state_matches!(HolderState::Release {
        release_initiation: ReleaseInitiation::Manual {
            unsellable_reason: None
        },
        sub_state: ReleaseState::StartRelease,
    });

    super::tick().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnterAuthnMethodRegistrationMode {
            registration_id: None
        },
        ..
    });

    let expiration_provided = TEST_RELEASE_EXPIRATION_NANOS;
    mock_authn_method_registration_mode_enter_ok(expiration_provided);
    super::tick().await;

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

    super::tick().await;
    super::tick().await;
    super::tick().await;
    super::tick().await;
    super::tick().await;
    super::tick().await;
    super::tick().await;
    super::tick().await;
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
