use candid::{CandidType, Decode, Encode};
use common_canister_impl::{
    components::identity::api::{
        Aud, AuthnMethod, AuthnMethodConfirmationCode, AuthnMethodData, AuthnMethodProtection,
        AuthnMethodPurpose, AuthnMethodRegisterRet, AuthnMethodRegistrationInfo,
        AuthnMethodRegistrationModeExitError, AuthnMethodSecuritySettings, IdentityInfo,
        IdentityInfoError, IdentityInfoRet, MetadataMapV2, OpenIdCredential, WebAuthn,
    },
    handlers::ic_request::public_key::uncompressed_public_key_to_asn1_block,
};
use common_canister_types::components::identity::{Iss, Sub, Timestamp};
use contract_canister_api::{
    cancel_capture_identity::CancelCaptureIdentityError,
    start_capture_identity::StartCaptureIdentityError,
    types::holder::{CaptureState, HolderState, ReleaseInitiation, ReleaseState},
};
use serde::Deserialize;

use crate::{
    handlers::holder::states::{
        get_holder_model, obtain_identity_authn_methods::is_openid_credentials_present,
    },
    result_err_matches, result_ok_with_holder_information,
    test::tests::{
        activate_contract::ht_init_and_activate_contract,
        components::{
            ecdsa::PUBLIC_KEY, ic::set_test_caller, ic_agent::set_test_ic_agent_response,
            time::set_test_time,
        },
        holder_auth_registration::ht_holder_authn_method_registration,
        ht_get_test_deployer, ht_get_test_hub_canister, HT_CAPTURED_IDENTITY_NUMBER,
        HT_SALE_DEAL_SAFE_CLOSE_DURATION,
    },
    test_state_matches,
    updates::holder::{
        cancel_capture_identity::cancel_capture_identity_int,
        confirm_holder_authn_method_registration::confirm_holder_authn_method_registration_int,
        start_capture_identity::start_capture_identity_int,
    },
};

#[tokio::test]
async fn test_start_capture() {
    let owner = ht_get_test_deployer();
    let other = ht_get_test_hub_canister();

    ht_init_and_activate_contract(12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION, owner).await;
    test_state_matches!(HolderState::WaitingStartCapture { .. });

    // fail check owner
    set_test_caller(other);
    let result = start_capture_identity_int(123).await;
    result_err_matches!(result, StartCaptureIdentityError::PermissionDenied);

    // call owner
    set_test_caller(owner);
    set_test_time(11);
    let result = start_capture_identity_int(123).await;
    let holder_information = result_ok_with_holder_information!(result);
    assert_eq!(holder_information.identity_number, Some(123));
    assert_eq!(
        holder_information.state,
        HolderState::Capture {
            sub_state: CaptureState::StartCapture,
        }
    );
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::StartCapture,
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::CreateEcdsaKey,
    });

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Capture {
        sub_state: CaptureState::RegisterAuthnMethodSession,
    });

    // TEST CANCEL

    set_test_caller(other);
    let result = cancel_capture_identity_int().await;
    result_err_matches!(result, CancelCaptureIdentityError::PermissionDenied);

    set_test_caller(owner);
    let result = cancel_capture_identity_int().await;
    let holder_information = result_ok_with_holder_information!(result);
    assert!(holder_information.processing_error.is_none());
    assert_eq!(holder_information.identity_number, None);
    assert_eq!(holder_information.state, HolderState::WaitingStartCapture);
    test_state_matches!(HolderState::WaitingStartCapture { .. });

    get_holder_model(|_, model| {
        assert_eq!(model.ecdsa_key, None);
    });
}

#[tokio::test]
async fn test_start_capture_fail() {
    let owner = ht_get_test_deployer();

    ht_init_and_activate_contract(12 + HT_SALE_DEAL_SAFE_CLOSE_DURATION, owner).await;
    test_state_matches!(HolderState::WaitingStartCapture { .. });

    set_test_caller(owner);
    set_test_time(12);
    let result = start_capture_identity_int(123).await;
    result_err_matches!(
        result,
        StartCaptureIdentityError::CertificateExpirationImminent
    );
}

#[tokio::test]
async fn test_check_openid_credentials_present() {
    #[derive(CandidType, Deserialize, Debug)]
    pub struct OpenIdCredentialPrevious {
        pub aud: Aud,
        pub iss: Iss,
        pub sub: Sub,
        pub metadata: Box<MetadataMapV2>,
        pub last_usage_timestamp: Timestamp,
    }

    #[derive(CandidType, Deserialize, Debug)]
    pub struct IdentityInfoPrevious {
        pub authn_methods: Vec<AuthnMethodData>,
        pub metadata: Box<MetadataMapV2>,
        pub authn_method_registration: Option<AuthnMethodRegistrationInfo>,
        pub openid_credentials: Option<Vec<OpenIdCredentialPrevious>>,
        pub name: Option<String>,
        pub created_at: Option<Timestamp>,
    }

    #[derive(CandidType, Deserialize)]
    pub enum IdentityInfoRetPrevious {
        Ok(IdentityInfoPrevious),
        Err(IdentityInfoError),
    }

    let ret_previous = IdentityInfoRet::Ok(IdentityInfo {
        authn_methods: vec![],
        metadata: Box::new(MetadataMapV2(vec![])),
        authn_method_registration: Some(AuthnMethodRegistrationInfo {
            expiration: 111,
            authn_method: None,
        }),
        openid_credentials: Some(vec![OpenIdCredential {
            aud: "my aud".to_string(),
            iss: "my iss".to_string(),
            sub: "my sub".to_string(),
            metadata: Box::new(MetadataMapV2(vec![])),
            last_usage_timestamp: Some(121),
        }]),
        name: Some("John Doe".to_string()),
        created_at: Some(1212),
    });

    let slice = Encode!(&ret_previous).unwrap();
    assert!(is_openid_credentials_present(&slice).unwrap());

    let decoded_ret = Decode!(&slice, IdentityInfoRetPrevious).unwrap();

    match decoded_ret {
        IdentityInfoRetPrevious::Ok(info) => {
            assert!(info.openid_credentials.is_none());
        }
        IdentityInfoRetPrevious::Err(_) => panic!(),
    }
}

#[tokio::test]
async fn test_identity_api_changed() {
    #[derive(CandidType, Deserialize, Debug)]
    pub struct OpenIdCredentialNew {
        pub aud: Aud,
        pub iss: Iss,
        pub sub: Option<Sub>,
        pub metadata: Box<MetadataMapV2>,
        pub last_usage_timestamp: Option<Timestamp>,
    }

    #[derive(CandidType, Deserialize, Debug)]
    pub struct IdentityInfoNew {
        pub authn_methods: Vec<AuthnMethodData>,
        pub metadata: Box<MetadataMapV2>,
        pub authn_method_registration: Option<AuthnMethodRegistrationInfo>,
        pub openid_credentials: Option<Vec<OpenIdCredentialNew>>,
        pub name: Option<String>,
        pub created_at: Option<Timestamp>,
    }

    #[derive(CandidType, Deserialize)]
    pub enum IdentityInfoRetNew {
        Ok(IdentityInfoNew),
        Err(IdentityInfoError),
    }

    ht_holder_authn_method_registration(
        2 * 24 * 60 * 60 * 1000,
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
        Encode!(&IdentityInfoRetNew::Ok(IdentityInfoNew {
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
            openid_credentials: Some(vec![OpenIdCredentialNew {
                aud: "aud".to_string(),
                iss: "iss".to_string(),
                sub: Some("sub".to_string()),
                metadata: Box::new(MetadataMapV2(vec![])),
                last_usage_timestamp: None,
            }]),
            name: None,
            created_at: None,
        }))
        .unwrap(),
    );

    crate::handlers::holder::processor::process_holder_with_lock().await;
    test_state_matches!(HolderState::Release {
        release_initiation: ReleaseInitiation::IdentityAPIChanged,
        sub_state: ReleaseState::IdentityAPIChanged,
    });
}
