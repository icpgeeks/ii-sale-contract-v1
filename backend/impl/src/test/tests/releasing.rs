use candid::Encode;
use common_canister_impl::components::identity::api::{
    AuthnMethodConfirmRet, AuthnMethodConfirmationError, AuthnMethodRegistrationModeEnterRet,
    AuthnMethodRegistrationModeExitError, AuthnMethodRegistrationModeExitRet, AuthnMethodRemoveRet,
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
    handlers::holder::states::enter_authn_method_registration_mode::generate_random_string,
    processing_err_matches, result_err_matches, result_ok_with_holder_information,
    test::tests::{
        check_assets::{ht_capture_identity_and_fetch_assets_common, ht_fetch_assets},
        components::{
            ic::set_test_caller, ic_agent::set_test_ic_agent_response,
            identity::set_test_additional_auth, time::set_test_time,
        },
        fetch_assets::ht_capture_identity_and_fetch_assets,
        ht_get_test_deployer, ht_get_test_hub_canister,
        sale::ht_end_quarantine,
        HT_CAPTURED_IDENTITY_NUMBER, HT_QUARANTINE_DURATION, HT_SALE_DEAL_SAFE_CLOSE_DURATION,
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
    ht_capture_identity_and_fetch_assets(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        test_identity_number,
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

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnterAuthnMethodRegistrationMode {
            registration_id: None
        },
        ..
    });

    let expiration_provided = 60_000_000_000;
    let expiration_provided_millis = nanos_to_millis(&(expiration_provided as u128));
    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegistrationModeEnterRet::Ok {
            expiration: expiration_provided
        })
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::states::get_holder_model(|_, model| match &model.state.value {
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
            assert_eq!(registration_id, "00000");
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

    set_test_ic_agent_response(Encode!(&AuthnMethodConfirmRet::Ok).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;
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
    crate::handlers::holder::states::get_holder_model(|_, model| {
        set_test_additional_auth(model.get_ecdsa_as_uncompressed_public_key());
    });
    set_test_ic_agent_response(Encode!(&AuthnMethodRemoveRet::Ok).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Closed {
        unsellable_reason
    } if unsellable_reason == &unsellable_reason_opt);
}

#[tokio::test]
async fn test_releasing() {
    let test_identity_number = 777;
    ht_capture_identity_and_fetch_assets(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        test_identity_number,
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

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnterAuthnMethodRegistrationMode {
            registration_id: None
        },
        ..
    });

    let expiration_provided = 60_000_000_000;
    let expiration_provided_millis = nanos_to_millis(&(expiration_provided as u128));
    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegistrationModeEnterRet::Ok {
            expiration: expiration_provided
        })
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::states::get_holder_model(|_, model| match &model.state.value {
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
            assert_eq!(registration_id, "00000");
        }
        _ => panic!(
            "Expected WaitingAuthnMethodRegistration state, {:?}",
            model.state.value
        ),
    });
    // emulate expiration
    set_test_time(expiration_provided_millis + 1);
    crate::handlers::holder::processor::process_holder_with_lock().await;
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
        set_test_ic_agent_response(
            Encode!(&AuthnMethodRegistrationModeEnterRet::Ok {
                expiration: expiration_provided
            })
            .unwrap(),
        );
        crate::handlers::holder::processor::process_holder_with_lock().await;
        crate::handlers::holder::states::get_holder_model(|_, model| match &model.state.value {
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
                assert_eq!(registration_id, "00000");
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

        set_test_ic_agent_response(Encode!(&AuthnMethodConfirmRet::Err(common_canister_impl::components::identity::api::AuthnMethodConfirmationError::WrongCode { retries_left: 3 })).unwrap());
        crate::handlers::holder::processor::process_holder_with_lock().await;
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

            set_test_ic_agent_response(Encode!(&common_canister_impl::components::identity::api::AuthnMethodRegistrationModeExitRet::Ok(())).unwrap());
            crate::handlers::holder::processor::process_holder_with_lock().await;
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

        set_test_ic_agent_response(Encode!(&AuthnMethodConfirmRet::Ok).unwrap());
        crate::handlers::holder::processor::process_holder_with_lock().await;
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
            crate::handlers::holder::states::get_holder_model(|_, model| {
                set_test_additional_auth(model.get_ecdsa_as_uncompressed_public_key());
            });
            set_test_ic_agent_response(Encode!(&AuthnMethodRemoveRet::Err).unwrap());
        }
        crate::handlers::holder::processor::process_holder_with_lock().await;
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

            set_test_ic_agent_response(
                Encode!(&AuthnMethodRegistrationModeExitRet::Err(
                    AuthnMethodRegistrationModeExitError::InternalCanisterError("ss".to_owned())
                ))
                .unwrap(),
            );

            crate::handlers::holder::processor::process_holder_with_lock().await;

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
    crate::handlers::holder::states::get_holder_model(|_, model| {
        set_test_additional_auth(model.get_ecdsa_as_uncompressed_public_key());
    });
    set_test_ic_agent_response(Encode!(&AuthnMethodRemoveRet::Ok).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Closed {
        unsellable_reason: None
    });
}

#[tokio::test]
async fn test_releasing_after_quarantine() {
    let test_identity_number = 779;
    ht_capture_identity_and_fetch_assets(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        test_identity_number,
    )
    .await;

    // END OF QUARANTINE
    ht_end_quarantine().await;
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
    ht_capture_identity_and_fetch_assets(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        test_identity_number,
    )
    .await;

    // END OF QUARANTINE
    ht_end_quarantine().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::Hold {
            quarantine: None,
            sale_deal_state: None,
        }
    });

    set_test_time(HT_SALE_DEAL_SAFE_CLOSE_DURATION);

    crate::handlers::holder::processor::process_holder_with_lock().await;
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
    ht_capture_identity_and_fetch_assets(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        test_identity_number,
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
    ht_capture_identity_and_fetch_assets(
        2 * HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        test_identity_number,
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

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Release {
        sub_state: ReleaseState::EnterAuthnMethodRegistrationMode {
            registration_id: None
        },
        ..
    });

    let expiration_provided = 60_000_000_000;
    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegistrationModeEnterRet::Ok {
            expiration: expiration_provided
        })
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;

    // Attempt with wrong code
    let wrong_code = "9999".to_string();
    let result =
        confirm_owner_authn_method_registration_int(ConfirmOwnerAuthnMethodRegistrationArgs {
            verification_code: wrong_code.clone(),
        })
        .await;
    result_ok_with_holder_information!(result);

    // Set response to indicate wrong code
    set_test_ic_agent_response(
        Encode!(&AuthnMethodConfirmRet::Err(
            AuthnMethodConfirmationError::WrongCode { retries_left: 2 }
        ))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
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

    set_test_ic_agent_response(Encode!(&AuthnMethodConfirmRet::Ok).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;
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
    crate::handlers::holder::states::get_holder_model(|_, model| {
        set_test_additional_auth(model.get_ecdsa_as_uncompressed_public_key());
    });
    set_test_ic_agent_response(Encode!(&AuthnMethodRemoveRet::Ok).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Closed {
        unsellable_reason: None
    });
}

#[tokio::test]
async fn test_release_when_fetch_assets() {
    let owner = ht_get_test_deployer();
    ht_capture_identity_and_fetch_assets_common(
        2 * 24 * 60 * 60 * 1000,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_time(HT_QUARANTINE_DURATION + 1);
    crate::handlers::holder::processor::process_holder_with_lock().await;
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
    ht_capture_identity_and_fetch_assets_common(
        2 * 24 * 60 * 60 * 1000,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_time(HT_QUARANTINE_DURATION + 1);
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::StartFetchAssets,
            ..
        }
    });

    ht_fetch_assets().await;

    crate::handlers::holder::processor::process_holder_with_lock().await;
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
    ht_capture_identity_and_fetch_assets_common(
        2 * 24 * 60 * 60 * 1000,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_time(HT_QUARANTINE_DURATION + 1);
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::StartFetchAssets,
            ..
        }
    });

    ht_fetch_assets().await;

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::CheckAssets {
            sub_state: CheckAssetsState::StartCheckAssets,
            ..
        }
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
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
