use candid::{Encode, Principal};
use common_canister_impl::{
    components::identity::api::{
        AuthnMethod, AuthnMethodConfirmationCode, AuthnMethodData, AuthnMethodProtection,
        AuthnMethodPurpose, AuthnMethodRegisterError, AuthnMethodRegisterRet,
        AuthnMethodRegistrationModeExitError, AuthnMethodSecuritySettings, IdentityInfo,
        IdentityInfoRet, MetadataMapV2, WebAuthn,
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

use crate::{
    handlers::holder::states::get_holder_model,
    result_ok_with_holder_information,
    test::tests::{
        activate_contract::ht_init_and_activate_contract,
        components::{ic::set_test_caller, ic_agent::set_test_ic_agent_response},
        ht_get_test_deployer, ht_get_test_hub_canister, HT_CAPTURED_IDENTITY_NUMBER,
        HT_SALE_DEAL_SAFE_CLOSE_DURATION, PUBLIC_KEY,
    },
    test_state_matches,
    updates::holder::{
        cancel_capture_identity::cancel_capture_identity_int,
        confirm_holder_authn_method_registration::confirm_holder_authn_method_registration_int,
        protected_authn_method_deleted::protected_authn_method_deleted_int,
        start_capture_identity::start_capture_identity_int,
    },
};

pub(crate) async fn ht_holder_authn_method_registration(
    certificate_expiration: TimestampMillis,
    contract_owner: Principal,
    identity_number: u64,
) {
    ht_init_and_activate_contract(certificate_expiration, contract_owner).await;

    set_test_caller(ht_get_test_deployer());

    assert!(start_capture_identity_int(identity_number).await.is_ok());

    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::RegisterAuthnMethodSession,
    });
}

pub(crate) async fn ht_capture_identity(
    certificate_expiration: TimestampMillis,
    contract_owner: Principal,
    identity_number: u64,
) {
    ht_holder_authn_method_registration(certificate_expiration, contract_owner, identity_number)
        .await;

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: "cc".to_owned(),
            expiration: 4444_000_000,
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;

    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, &"cc".to_owned());
            assert_eq!(expiration, &4444);
        }
        _ => panic!("Unexpected state"),
    });

    let hostname = "aa.bb.cc".to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if frontend_hostname == &hostname);

    let result: Result<(), AuthnMethodRegistrationModeExitError> = Ok(());
    set_test_ic_agent_response(Encode!(&result).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;

    set_test_ic_agent_response(Encode!(&ht_get_test_hub_canister()).unwrap());

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ObtainingIdentityAuthnMethods,
    });

    let identity_name = "John Doe".to_string();
    set_test_ic_agent_response(
        Encode!(&IdentityInfoRet::Ok(IdentityInfo {
            authn_methods: vec![AuthnMethodData {
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
                })
            }],
            metadata: Box::new(MetadataMapV2(vec![])),
            authn_method_registration: None,
            openid_credentials: None,
            name: Some(identity_name.clone()),
            created_at: None,
        }))
        .unwrap(),
    );

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::FinishCapture,
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::StartFetchAssets,
            ..
        }
    });

    get_holder_model(|_, model| {
        assert_eq!(model.identity_name.as_ref().unwrap(), &identity_name);
    });
}

#[tokio::test]
async fn test_holder_auth_registration_fail_dangerous_lost() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: "cc".to_owned(),
            expiration: 4444_000_000,
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;

    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, &"cc".to_owned());
            assert_eq!(expiration, &4444);
        }
        _ => panic!("Unexpected state"),
    });

    let hostname = "aa.bb.cc".to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if frontend_hostname == &hostname);

    let result: Result<(), AuthnMethodRegistrationModeExitError> = Ok(());
    set_test_ic_agent_response(Encode!(&result).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;

    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::GetHolderContractPrincipal { frontend_hostname },
    } if frontend_hostname == &hostname);

    set_test_ic_agent_response(Encode!(&ht_get_test_deployer()).unwrap());

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Release {
        release_initiation: ReleaseInitiation::DangerousToLoseIdentity,
        sub_state: ReleaseState::DangerousToLoseIdentity,
    });
}

#[tokio::test]
async fn test_holder_auth_registration() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: "cc".to_owned(),
            expiration: 4444_000_000,
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, &"cc".to_owned());
            assert_eq!(expiration, &4444);
        }
        _ => panic!("Unexpected state"),
    });

    let hostname = "aa.bb.cc".to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if frontend_hostname == &hostname);

    let result: Result<(), AuthnMethodRegistrationModeExitError> = Ok(());
    set_test_ic_agent_response(Encode!(&result).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;

    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::GetHolderContractPrincipal { frontend_hostname },
    } if frontend_hostname == &hostname);

    set_test_ic_agent_response(Encode!(&ht_get_test_hub_canister()).unwrap());

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ObtainingIdentityAuthnMethods,
    });

    set_test_ic_agent_response(
        Encode!(&IdentityInfoRet::Ok(IdentityInfo {
            name: None,
            created_at: None,
            authn_methods: vec![AuthnMethodData {
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
                })
            }],
            metadata: Box::new(MetadataMapV2(vec![])),
            authn_method_registration: None,
            openid_credentials: None
        }))
        .unwrap(),
    );

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::FinishCapture,
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
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
                _ => panic!("Unexpected state"),
            },
            _ => panic!("Unexpected state"),
        };
    });
}

#[tokio::test]
async fn test_holder_auth_registration_fail_registration_off() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        666,
    )
    .await;

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Err(
            AuthnMethodRegisterError::RegistrationModeOff
        ))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::SessionRegistrationModeOff
        }
    });
}

#[tokio::test]
async fn test_holder_auth_registration_fail_registration_in_progress() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        667,
    )
    .await;

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Err(
            AuthnMethodRegisterError::RegistrationAlreadyInProgress
        ))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::SessionRegistrationAlreadyInProgress
        }
    });
}

#[tokio::test]
async fn test_holder_auth_registration_fail_invalid_metadata() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        668,
    )
    .await;

    let meta_data = "sdf".to_owned();
    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Err(
            AuthnMethodRegisterError::InvalidMetadata(meta_data.clone())
        ))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::InvalidMetadata(mt)
        }
    } if mt == &meta_data);
}

#[tokio::test]
async fn test_holder_auth_registration_with_expired_confirmation() {
    ht_holder_authn_method_registration(
        24 * 3_600 * 1000 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    let expiration_time = 4444;
    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: "cc".to_owned(),
            expiration: expiration_time * 1_000_000,
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, &"cc".to_owned());
            assert_eq!(expiration, &expiration_time);
        }
        _ => panic!("Unexpected state"),
    });

    // Set time to after expiration
    crate::test::tests::components::time::set_test_time(expiration_time + 1);

    // Process should move to expired state
    crate::handlers::holder::processor::process_holder_with_lock().await;
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
    crate::handlers::holder::processor::process_holder_with_lock().await;
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::RegisterAuthnMethodSession,
    });

    // Continue with normal flow

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: "ff".to_owned(),
            expiration: 2 * expiration_time * 1_000_000,
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, &"ff".to_owned());
            assert_eq!(expiration, &(2 * expiration_time));
        }
        _ => panic!("Unexpected state"),
    });

    // Successfully confirm registration
    let hostname = "aa.bb.cc".to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if frontend_hostname == &hostname);

    let result: Result<(), AuthnMethodRegistrationModeExitError> = Ok(());
    set_test_ic_agent_response(Encode!(&result).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;

    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::GetHolderContractPrincipal { frontend_hostname },
    } if frontend_hostname == &hostname);

    set_test_ic_agent_response(Encode!(&ht_get_test_hub_canister()).unwrap());
    // Complete the capture process
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ObtainingIdentityAuthnMethods,
    });
}

#[tokio::test]
async fn test_protected_authn_method_deleted() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: "cc".to_owned(),
            expiration: 4444_000_000,
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;
    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, &"cc".to_owned());
            assert_eq!(expiration, &4444);
        }
        _ => panic!("Unexpected state"),
    });

    let hostname = "aa.bb.cc".to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if  frontend_hostname == &hostname);

    let result: Result<(), AuthnMethodRegistrationModeExitError> = Ok(());
    set_test_ic_agent_response(Encode!(&result).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;

    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::GetHolderContractPrincipal { frontend_hostname },
    } if frontend_hostname == &hostname);

    set_test_ic_agent_response(Encode!(&ht_get_test_hub_canister()).unwrap());

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ObtainingIdentityAuthnMethods,
    });

    // Set up a protected authentication method
    let protected_key = [
        2, 249, 40, 81, 17, 40, 116, 210, 100, 99, 161, 128, 252, 96, 117, 88, 150, 166, 52, 93,
        10, 184, 30, 95, 170, 228, 245, 134, 182, 39, 124, 28, 99,
    ];
    set_test_ic_agent_response(
        Encode!(&IdentityInfoRet::Ok(IdentityInfo {
            name: None,
            created_at: None,
            authn_methods: vec![
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
                    })
                }
            ],
            metadata: Box::new(MetadataMapV2(vec![])),
            authn_method_registration: None,
            openid_credentials: None
        }))
        .unwrap(),
    );

    // Process should detect protected method
    crate::handlers::holder::processor::process_holder_with_lock().await;
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

    set_test_ic_agent_response(
        Encode!(&IdentityInfoRet::Ok(IdentityInfo {
            authn_methods: vec![AuthnMethodData {
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
                })
            }],
            metadata: Box::new(MetadataMapV2(vec![])),
            authn_method_registration: None,
            openid_credentials: None,
            name: None,
            created_at: None,
        }))
        .unwrap(),
    );

    // Process should continue with capture flow
    crate::handlers::holder::processor::process_holder_with_lock().await;

    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::FinishCapture,
    });

    // Complete the capture process
    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Holding {
        sub_state: HoldingState::FetchAssets {
            fetch_assets_state: FetchAssetsState::StartFetchAssets,
            ..
        }
    });
}

#[tokio::test]
async fn test_exit_holder_authn_method_registration_error_mode_off() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: "cc".to_owned(),
            expiration: 4444_000_000,
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;

    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, &"cc".to_owned());
            assert_eq!(expiration, &4444);
        }
        _ => panic!("Unexpected state"),
    });

    let hostname = "aa.bb.cc".to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if  frontend_hostname == &hostname);

    let result: Result<(), AuthnMethodRegistrationModeExitError> =
        Err(AuthnMethodRegistrationModeExitError::RegistrationModeOff);
    set_test_ic_agent_response(Encode!(&result).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;

    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::HolderAuthnMethodRegistrationModeOff
        },
    });
}

#[tokio::test]
async fn test_exit_holder_authn_method_registration_error_invalid_metadata() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: "cc".to_owned(),
            expiration: 4444_000_000,
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;

    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, &"cc".to_owned());
            assert_eq!(expiration, &4444);
        }
        _ => panic!("Unexpected state"),
    });

    let hostname = "aa.bb.cc".to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if  frontend_hostname == &hostname);

    let result: Result<(), AuthnMethodRegistrationModeExitError> = Err(
        AuthnMethodRegistrationModeExitError::InvalidMetadata("aaa".to_string()),
    );
    set_test_ic_agent_response(Encode!(&result).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;

    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::InvalidMetadata(s)
        },
    } if s == "aaa");
}

#[tokio::test]
async fn test_exit_holder_authn_method_registration_error_unauthorized() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: "cc".to_owned(),
            expiration: 4444_000_000,
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;

    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, &"cc".to_owned());
            assert_eq!(expiration, &4444);
        }
        _ => panic!("Unexpected state"),
    });

    let hostname = "aa.bb.cc".to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if  frontend_hostname == &hostname);

    let result: Result<(), AuthnMethodRegistrationModeExitError> = Err(
        AuthnMethodRegistrationModeExitError::Unauthorized(Principal::anonymous()),
    );
    set_test_ic_agent_response(Encode!(&result).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;

    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CaptureFailed {
            error: CaptureError::HolderAuthnMethodRegistrationUnauthorized
        },
    });
}

#[tokio::test]
async fn test_exit_holder_authn_method_registration_error_internal() {
    ht_holder_authn_method_registration(
        12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION,
        ht_get_test_deployer(),
        HT_CAPTURED_IDENTITY_NUMBER,
    )
    .await;

    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: "cc".to_owned(),
            expiration: 4444_000_000,
        }))
        .unwrap(),
    );
    crate::handlers::holder::processor::process_holder_with_lock().await;

    get_holder_model(|_, model| match &model.state.value {
        HolderState::Capture {
            sub_state:
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code,
                    expiration,
                },
        } => {
            assert_eq!(confirmation_code, &"cc".to_owned());
            assert_eq!(expiration, &4444);
        }
        _ => panic!("Unexpected state"),
    });

    let hostname = "aa.bb.cc".to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname.clone()).await;
    let _ = result_ok_with_holder_information!(result);
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if  frontend_hostname == &hostname);

    let result: Result<(), AuthnMethodRegistrationModeExitError> = Err(
        AuthnMethodRegistrationModeExitError::InternalCanisterError("Internal error".to_owned()),
    );
    set_test_ic_agent_response(Encode!(&result).unwrap());
    crate::handlers::holder::processor::process_holder_with_lock().await;

    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
    } if  frontend_hostname == &hostname);
}
