use candid::Principal;
use common_canister_impl::{
    components::identity::api::{
        AuthnMethod, AuthnMethodData, AuthnMethodProtection, AuthnMethodPurpose,
        AuthnMethodRegisterError, AuthnMethodRegistrationModeExitError,
        AuthnMethodSecuritySettings, MetadataMapV2, WebAuthn,
    },
    handlers::ic_request::public_key::uncompressed_public_key_to_asn1_block,
};
use common_canister_types::TimestampMillis;
use contract_canister_api::{
    protected_authn_method_deleted::ProtectedAuthnMethodDeletedError,
    types::holder::{
        CaptureError, CaptureState, CheckAssetsState, FetchAssetsState, HolderState, HoldingState,
        ReleaseInitiation, ReleaseState,
    },
};

use crate::test::tests::support::mocks::{
    mock_authn_method_register_err, mock_authn_method_register_ok,
    mock_authn_method_registration_mode_exit_err, mock_authn_method_registration_mode_exit_ok,
    mock_identity_info_ok, mock_obtain_hub_canister_ok,
};
use crate::{
    handlers::holder::states::get_holder_model,
    result_ok_with_holder_information,
    test::tests::{
        activate_contract::ht_init_and_activate_contract, components::ic::set_test_caller,
        ht_get_test_deployer, ht_get_test_hub_canister, HT_CAPTURED_IDENTITY_NUMBER,
        HT_SALE_DEAL_SAFE_CLOSE_DURATION, PUBLIC_KEY, TEST_AUTHN_CONFIRMATION_CODE,
        TEST_AUTHN_REGISTER_EXPIRATION_MILLIS, TEST_AUTHN_REGISTER_EXPIRATION_NANOS,
        TEST_CAPTURE_HOSTNAME,
    },
    test_state_matches,
    updates::holder::{
        cancel_capture_identity::cancel_capture_identity_int,
        confirm_holder_authn_method_registration::confirm_holder_authn_method_registration_int,
        protected_authn_method_deleted::protected_authn_method_deleted_int,
        start_capture_identity::start_capture_identity_int,
    },
};

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

/// Drives the state machine to `CaptureState::RegisterAuthnMethodSession`.
///
/// Initialises + activates the contract, starts capture, and advances two ticks so the
/// state machine lands in `RegisterAuthnMethodSession` — ready for the caller to inject
/// the mock authn-method-register IC-agent response.
pub(crate) async fn ht_holder_authn_method_registration(
    certificate_expiration: TimestampMillis,
    contract_owner: candid::Principal,
    identity_number: u64,
) {
    ht_init_and_activate_contract(certificate_expiration, contract_owner).await;

    set_test_caller(ht_get_test_deployer());

    assert!(start_capture_identity_int(identity_number).await.is_ok());

    super::tick().await;
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::RegisterAuthnMethodSession,
    });
}

/// Advances the state machine from `RegisterAuthnMethodSession` to
/// `ExitAndRegisterHolderAuthnMethod`.
///
/// Steps performed:
/// 1. Mocks `mock_authn_method_register_ok` with the test confirmation code / expiration.
/// 2. One tick → `NeedConfirmAuthnMethodSessionRegistration`; asserts stored code and expiration.
/// 3. Calls `confirm_holder_authn_method_registration_int(TEST_CAPTURE_HOSTNAME)`.
/// 4. Asserts state = `ExitAndRegisterHolderAuthnMethod { TEST_CAPTURE_HOSTNAME }`.
///
/// **Precondition:** state machine is in `CaptureState::RegisterAuthnMethodSession`.
/// **Postcondition:** state machine is in `CaptureState::ExitAndRegisterHolderAuthnMethod`.
pub(crate) async fn ht_advance_to_exit_authn_method_registration() {
    mock_authn_method_register_ok(
        TEST_AUTHN_CONFIRMATION_CODE,
        TEST_AUTHN_REGISTER_EXPIRATION_NANOS,
    );
    super::tick().await;

    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, TEST_AUTHN_CONFIRMATION_CODE);
            assert_eq!(*expiration, TEST_AUTHN_REGISTER_EXPIRATION_MILLIS);
        }
        _ => panic!(
            "Expected NeedConfirmAuthnMethodSessionRegistration, got: {:?}",
            model.state.value
        ),
    });

    let hostname = TEST_CAPTURE_HOSTNAME.to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if frontend_hostname == &hostname);
}

// ---------------------------------------------------------------------------
// test_holder_auth_registration_fail_dangerous_lost
// ---------------------------------------------------------------------------

/// When the hub canister returns the deployer principal (not the hub principal), the
/// state machine detects the mismatch and transitions to `DangerousToLoseIdentity`.
#[tokio::test]
async fn test_holder_auth_registration_fail_dangerous_lost() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    ht_advance_to_exit_authn_method_registration().await;
    // State: ExitAndRegisterHolderAuthnMethod { TEST_CAPTURE_HOSTNAME }

    mock_authn_method_registration_mode_exit_ok();
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::GetHolderContractPrincipal { frontend_hostname },
    } if frontend_hostname == TEST_CAPTURE_HOSTNAME);

    // Hub returns the *deployer* principal → dangerous mismatch
    mock_obtain_hub_canister_ok(ht_get_test_deployer());
    super::tick().await;
    test_state_matches!(HolderState::Release {
        release_initiation: ReleaseInitiation::DangerousToLoseIdentity,
        sub_state: ReleaseState::DangerousToLoseIdentity,
    });
}

// ---------------------------------------------------------------------------
// test_holder_auth_registration
// ---------------------------------------------------------------------------

/// Happy-path capture: drives all the way from `RegisterAuthnMethodSession` to
/// `Holding::FetchAssets::StartFetchAssets`.
#[tokio::test]
async fn test_holder_auth_registration() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    ht_advance_to_exit_authn_method_registration().await;
    // State: ExitAndRegisterHolderAuthnMethod { TEST_CAPTURE_HOSTNAME }

    mock_authn_method_registration_mode_exit_ok();
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::GetHolderContractPrincipal { frontend_hostname },
    } if frontend_hostname == TEST_CAPTURE_HOSTNAME);

    mock_obtain_hub_canister_ok(ht_get_test_hub_canister());
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ObtainingIdentityAuthnMethods,
    });

    mock_identity_info_ok(vec![AuthnMethodData {
        security_settings: AuthnMethodSecuritySettings {
            protection: AuthnMethodProtection::Protected,
            purpose: AuthnMethodPurpose::Authentication,
        },
        metadata: Box::new(MetadataMapV2(vec![])),
        last_authentication: None,
        authn_method: AuthnMethod::WebAuthn(WebAuthn {
            pubkey: uncompressed_public_key_to_asn1_block(
                secp256k1::PublicKey::from_slice(&PUBLIC_KEY)
                    .unwrap()
                    .serialize_uncompressed(),
            )
            .into(),
            credential_id: vec![1, 2, 4].into(),
        }),
    }]);
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::FinishCapture,
    });

    super::tick().await;
    get_holder_model(|_, model| {
        match &model.state.value {
            HolderState::Holding {
                sub_state:
                    HoldingState::FetchAssets {
                        fetch_assets_state: FetchAssetsState::StartFetchAssets,
                        wrap_holding_state,
                    },
            } => match wrap_holding_state.as_ref() {
                HoldingState::CheckAssets {
                    sub_state: CheckAssetsState::StartCheckAssets,
                    wrap_holding_state,
                } => matches!(wrap_holding_state.as_ref(), &HoldingState::StartHolding),
                _ => panic!("Unexpected inner state"),
            },
            _ => panic!("Unexpected state"),
        };
    });
}

// ---------------------------------------------------------------------------
// test_holder_auth_registration_fail_registration_off
// ---------------------------------------------------------------------------

/// If the IC-identity canister returns `RegistrationModeOff`, the capture transitions to
/// `CaptureFailed::SessionRegistrationModeOff`.
#[tokio::test]
async fn test_holder_auth_registration_fail_registration_off() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        666,
    )
    .await;

    mock_authn_method_register_err(AuthnMethodRegisterError::RegistrationModeOff);
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::SessionRegistrationModeOff
        }
    });
}

// ---------------------------------------------------------------------------
// test_holder_auth_registration_fail_registration_in_progress
// ---------------------------------------------------------------------------

/// If the IC-identity canister returns `RegistrationAlreadyInProgress`, the capture
/// transitions to `CaptureFailed::SessionRegistrationAlreadyInProgress`.
#[tokio::test]
async fn test_holder_auth_registration_fail_registration_in_progress() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        667,
    )
    .await;

    mock_authn_method_register_err(AuthnMethodRegisterError::RegistrationAlreadyInProgress);
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::SessionRegistrationAlreadyInProgress
        }
    });
}

// ---------------------------------------------------------------------------
// test_holder_auth_registration_fail_invalid_metadata
// ---------------------------------------------------------------------------

/// If the IC-identity canister returns `InvalidMetadata`, the capture transitions to
/// `CaptureFailed::InvalidMetadata`.
#[tokio::test]
async fn test_holder_auth_registration_fail_invalid_metadata() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        668,
    )
    .await;

    let meta_data = "sdf".to_owned();
    mock_authn_method_register_err(AuthnMethodRegisterError::InvalidMetadata(meta_data.clone()));
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::InvalidMetadata(mt)
        }
    } if mt == &meta_data);
}

// ---------------------------------------------------------------------------
// test_holder_auth_registration_with_expired_confirmation
// ---------------------------------------------------------------------------

/// If the confirmation code expires before the user confirms it, the capture transitions
/// to `CaptureFailed::SessionRegistrationModeExpired`. The user can then cancel and
/// restart capture successfully.
#[tokio::test]
async fn test_holder_auth_registration_with_expired_confirmation() {
    ht_holder_authn_method_registration(
        24 * 3_600 * 1000 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    // Use a short expiration (millis) so we can advance past it easily.
    let expiration_time: u64 = 4_444;
    mock_authn_method_register_ok(TEST_AUTHN_CONFIRMATION_CODE, expiration_time * 1_000_000);
    super::tick().await;
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, TEST_AUTHN_CONFIRMATION_CODE);
            assert_eq!(*expiration, expiration_time);
        }
        _ => panic!("Unexpected state"),
    });

    // Set time to after expiration
    crate::test::tests::components::time::set_test_time(expiration_time + 1);

    // Process should move to expired state
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::SessionRegistrationModeExpired
        }
    });

    // cancel capture
    set_test_caller(ht_get_test_deployer());
    let result = cancel_capture_identity_int().await;
    assert!(result.is_ok());
    test_state_matches!(HolderState::WaitingStartCapture);

    // Re-enter registration mode
    let result = start_capture_identity_int(HT_CAPTURED_IDENTITY_NUMBER).await;
    assert!(result.is_ok());
    super::tick().await;
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::RegisterAuthnMethodSession,
    });

    // Second attempt — use a fresh (longer) expiration
    mock_authn_method_register_ok(
        TEST_AUTHN_CONFIRMATION_CODE,
        2 * expiration_time * 1_000_000,
    );
    super::tick().await;
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, TEST_AUTHN_CONFIRMATION_CODE);
            assert_eq!(*expiration, 2 * expiration_time);
        }
        _ => panic!("Unexpected state"),
    });

    // Successfully confirm registration
    let hostname = TEST_CAPTURE_HOSTNAME.to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if frontend_hostname == &hostname);

    mock_authn_method_registration_mode_exit_ok();
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::GetHolderContractPrincipal { frontend_hostname },
    } if frontend_hostname == &hostname);

    mock_obtain_hub_canister_ok(ht_get_test_hub_canister());
    // Complete the capture process
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ObtainingIdentityAuthnMethods,
    });
}

// ---------------------------------------------------------------------------
// test_protected_authn_method_deleted
// ---------------------------------------------------------------------------

/// When the identity has a second *protected* authn method, capture detects it and
/// transitions to `NeedDeleteProtectedIdentityAuthnMethod`. After the owner acknowledges
/// the deletion the state machine continues with capture.
#[tokio::test]
async fn test_protected_authn_method_deleted() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    ht_advance_to_exit_authn_method_registration().await;
    // State: ExitAndRegisterHolderAuthnMethod { TEST_CAPTURE_HOSTNAME }

    mock_authn_method_registration_mode_exit_ok();
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::GetHolderContractPrincipal { frontend_hostname },
    } if frontend_hostname == TEST_CAPTURE_HOSTNAME);

    mock_obtain_hub_canister_ok(ht_get_test_hub_canister());
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ObtainingIdentityAuthnMethods,
    });

    // Set up a protected authentication method
    let protected_key = [
        2, 249, 40, 81, 17, 40, 116, 210, 100, 99, 161, 128, 252, 96, 117, 88, 150, 166, 52, 93,
        10, 184, 30, 95, 170, 228, 245, 134, 182, 39, 124, 28, 99,
    ];
    mock_identity_info_ok(vec![
        AuthnMethodData {
            security_settings: AuthnMethodSecuritySettings {
                protection: AuthnMethodProtection::Protected,
                purpose: AuthnMethodPurpose::Authentication,
            },
            metadata: Box::new(MetadataMapV2(vec![])),
            last_authentication: None,
            authn_method: AuthnMethod::WebAuthn(WebAuthn {
                pubkey: uncompressed_public_key_to_asn1_block(
                    secp256k1::PublicKey::from_slice(&PUBLIC_KEY)
                        .unwrap()
                        .serialize_uncompressed(),
                )
                .into(),
                credential_id: vec![1, 2, 4].into(),
            }),
        },
        AuthnMethodData {
            security_settings: AuthnMethodSecuritySettings {
                protection: AuthnMethodProtection::Protected,
                purpose: AuthnMethodPurpose::Authentication,
            },
            metadata: Box::new(MetadataMapV2(vec![])),
            last_authentication: None,
            authn_method: AuthnMethod::WebAuthn(WebAuthn {
                pubkey: uncompressed_public_key_to_asn1_block(
                    secp256k1::PublicKey::from_slice(&protected_key)
                        .unwrap()
                        .serialize_uncompressed(),
                )
                .into(),
                credential_id: vec![5, 2, 4].into(),
            }),
        },
    ]);

    // Process should detect protected method
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::NeedDeleteProtectedIdentityAuthnMethod { .. },
    });

    // Test permission denied case
    set_test_caller(ht_get_test_hub_canister());
    let result = protected_authn_method_deleted_int().await;
    assert!(matches!(
        result,
        Err(ProtectedAuthnMethodDeletedError::PermissionDenied)
    ));

    // Test successful deletion
    set_test_caller(ht_get_test_deployer());
    let result = protected_authn_method_deleted_int().await;
    let _ = result_ok_with_holder_information!(result);

    mock_identity_info_ok(vec![AuthnMethodData {
        security_settings: AuthnMethodSecuritySettings {
            protection: AuthnMethodProtection::Protected,
            purpose: AuthnMethodPurpose::Authentication,
        },
        metadata: Box::new(MetadataMapV2(vec![])),
        last_authentication: None,
        authn_method: AuthnMethod::WebAuthn(WebAuthn {
            pubkey: uncompressed_public_key_to_asn1_block(
                secp256k1::PublicKey::from_slice(&PUBLIC_KEY)
                    .unwrap()
                    .serialize_uncompressed(),
            )
            .into(),
            credential_id: vec![1, 2, 4].into(),
        }),
    }]);

    // Process should continue with capture flow
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::FinishCapture,
    });

    // Complete the capture process
    super::tick().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::StartFetchAssets,
            ..
        }
    });
}

// ---------------------------------------------------------------------------
// test_exit_holder_authn_method_registration_error_mode_off
// ---------------------------------------------------------------------------

/// If exiting registration mode returns `RegistrationModeOff`, capture fails with
/// `HolderAuthnMethodRegistrationModeOff`.
#[tokio::test]
async fn test_exit_holder_authn_method_registration_error_mode_off() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    ht_advance_to_exit_authn_method_registration().await;
    // State: ExitAndRegisterHolderAuthnMethod { TEST_CAPTURE_HOSTNAME }

    mock_authn_method_registration_mode_exit_err(
        AuthnMethodRegistrationModeExitError::RegistrationModeOff,
    );
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::HolderAuthnMethodRegistrationModeOff
        },
    });
}

// ---------------------------------------------------------------------------
// test_exit_holder_authn_method_registration_error_invalid_metadata
// ---------------------------------------------------------------------------

/// If exiting registration mode returns `InvalidMetadata`, capture fails with
/// `InvalidMetadata`.
#[tokio::test]
async fn test_exit_holder_authn_method_registration_error_invalid_metadata() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    ht_advance_to_exit_authn_method_registration().await;
    // State: ExitAndRegisterHolderAuthnMethod { TEST_CAPTURE_HOSTNAME }

    mock_authn_method_registration_mode_exit_err(
        AuthnMethodRegistrationModeExitError::InvalidMetadata("aaa".to_string()),
    );
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::InvalidMetadata(s)
        },
    } if s == "aaa");
}

// ---------------------------------------------------------------------------
// test_exit_holder_authn_method_registration_error_unauthorized
// ---------------------------------------------------------------------------

/// If exiting registration mode returns `Unauthorized`, capture fails with
/// `HolderAuthnMethodRegistrationUnauthorized`.
#[tokio::test]
async fn test_exit_holder_authn_method_registration_error_unauthorized() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    ht_advance_to_exit_authn_method_registration().await;
    // State: ExitAndRegisterHolderAuthnMethod { TEST_CAPTURE_HOSTNAME }

    mock_authn_method_registration_mode_exit_err(
        AuthnMethodRegistrationModeExitError::Unauthorized(Principal::anonymous()),
    );
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::HolderAuthnMethodRegistrationUnauthorized
        },
    });
}

// ---------------------------------------------------------------------------
// test_exit_holder_authn_method_registration_error_internal
// ---------------------------------------------------------------------------

/// If exiting registration mode returns `InternalCanisterError`, capture stays in
/// `ExitAndRegisterHolderAuthnMethod` (retryable).
#[tokio::test]
async fn test_exit_holder_authn_method_registration_error_internal() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    ht_advance_to_exit_authn_method_registration().await;
    // State: ExitAndRegisterHolderAuthnMethod { TEST_CAPTURE_HOSTNAME }

    mock_authn_method_registration_mode_exit_err(
        AuthnMethodRegistrationModeExitError::InternalCanisterError("Internal error".to_owned()),
    );
    super::tick().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if frontend_hostname == TEST_CAPTURE_HOSTNAME);
}
