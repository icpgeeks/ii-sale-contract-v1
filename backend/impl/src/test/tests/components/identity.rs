use std::{cell::RefCell, time::Duration};

use async_trait::async_trait;
use candid::Principal;
use common_canister_impl::{
    components::identity::{
        api::{
            AuthnMethod, AuthnMethodConfirmRet, AuthnMethodConfirmationCode, AuthnMethodData,
            AuthnMethodRegisterError, AuthnMethodRegisterRet, AuthnMethodRegistrationModeEnterRet,
            AuthnMethodRegistrationModeExitRet, AuthnMethodRemoveRet, GetDelegationResponse,
            IdentityAuthnInfo, IdentityAuthnInfoRet, IdentityInfoRet, OpenidCredentialRemoveRet,
            PublicKey, RegistrationId, UserNumber, WebAuthn,
        },
        interface::Identity,
        interface_impl::IdentityImpl,
    },
    handlers::{
        ic_request::{builder::CanisterRequest, public_key::uncompressed_public_key_to_asn1_block},
        IcAgentRequestDefinition,
    },
};
use common_canister_types::{components::identity::OpenIdCredentialKey, TimestampNanos};
use contract_canister_api::types::holder::IdentityNumber;

use crate::test::tests::components::ecdsa::PUBLIC_KEY;

pub struct IdentityTest {
    pub proxy: IdentityImpl,
}

thread_local! {
    static __ADDITIONAL_AUTH: RefCell<Option<[u8; 65]>> = RefCell::default();
}

pub fn set_test_additional_auth(public_key: [u8; 65]) {
    __ADDITIONAL_AUTH.with(|ref_auth| {
        *ref_auth.borrow_mut() = Some(public_key);
    });
}

#[async_trait]
impl Identity for IdentityTest {
    async fn identity_authn_info(
        &self,
        _identity_number: IdentityNumber,
    ) -> Result<IdentityAuthnInfoRet, String> {
        let mut authn_methods = Vec::new();
        authn_methods.push(AuthnMethod::WebAuthn(WebAuthn {
            pubkey: uncompressed_public_key_to_asn1_block(
                secp256k1::PublicKey::from_slice(&PUBLIC_KEY)
                    .unwrap()
                    .serialize_uncompressed(),
            )
            .into(),
            credential_id: vec![1, 2, 4].into(),
        }));
        if __ADDITIONAL_AUTH.with(|ref_auth| ref_auth.borrow().is_some()) {
            authn_methods.push(AuthnMethod::WebAuthn(WebAuthn {
                pubkey: uncompressed_public_key_to_asn1_block(
                    __ADDITIONAL_AUTH.with(|ref_auth| ref_auth.borrow_mut().take().unwrap()),
                )
                .into(),
                credential_id: vec![1, 2, 8].into(),
            }));
        }
        Ok(IdentityAuthnInfoRet::Ok(IdentityAuthnInfo {
            authn_methods,
            recovery_authn_methods: vec![],
        }))
    }

    fn build_identity_info_request(
        &self,
        identity_number: &IdentityNumber,
    ) -> IcAgentRequestDefinition {
        self.proxy.build_identity_info_request(identity_number)
    }

    fn decode_identity_info_response(
        &self,
        response_data: &[u8],
    ) -> Result<IdentityInfoRet, String> {
        self.proxy.decode_identity_info_response(response_data)
    }

    async fn authn_method_register(
        &self,
        identity_number: IdentityNumber,
        _authn_method_data: AuthnMethodData,
    ) -> Result<AuthnMethodRegisterRet, String> {
        match identity_number {
            666 => Ok(AuthnMethodRegisterRet::Err(
                AuthnMethodRegisterError::RegistrationModeOff,
            )),
            667 => Ok(AuthnMethodRegisterRet::Err(
                AuthnMethodRegisterError::RegistrationAlreadyInProgress,
            )),
            668 => Ok(AuthnMethodRegisterRet::Err(
                AuthnMethodRegisterError::InvalidMetadata("wrong_metadata".to_string()),
            )),
            _ => Ok(AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
                confirmation_code: "123".to_owned(),
                expiration: 12313123412341,
            })),
        }
    }

    fn build_authn_method_session_register(
        &self,
        identity_number: &IdentityNumber,
    ) -> IcAgentRequestDefinition {
        self.proxy
            .build_authn_method_session_register(identity_number)
    }

    fn decode_authn_method_session_register(
        &self,
        response_data: &[u8],
    ) -> Result<AuthnMethodRegisterRet, String> {
        self.proxy
            .decode_authn_method_session_register(response_data)
    }

    fn build_authn_method_remove_request(
        &self,
        identity_number: &IdentityNumber,
        public_key: &PublicKey,
    ) -> IcAgentRequestDefinition {
        self.proxy
            .build_authn_method_remove_request(identity_number, public_key)
    }

    fn decode_authn_method_remove_response(
        &self,
        response_data: &[u8],
    ) -> Result<AuthnMethodRemoveRet, String> {
        self.proxy
            .decode_authn_method_remove_response(response_data)
    }

    fn build_authn_method_registration_mode_exit_request(
        &self,
        identity_number: &IdentityNumber,
        auth_method_data: &Option<AuthnMethodData>,
    ) -> IcAgentRequestDefinition {
        self.proxy
            .build_authn_method_registration_mode_exit_request(identity_number, auth_method_data)
    }

    fn decode_authn_method_registration_mode_exit_response(
        &self,
        response_data: &[u8],
    ) -> Result<AuthnMethodRegistrationModeExitRet, String> {
        self.proxy
            .decode_authn_method_registration_mode_exit_response(response_data)
    }

    fn build_openid_credential_remove_request(
        &self,
        identity_number: &IdentityNumber,
        key: &OpenIdCredentialKey,
    ) -> IcAgentRequestDefinition {
        self.proxy
            .build_openid_credential_remove_request(identity_number, key)
    }

    fn decode_openid_credential_remove_response(
        &self,
        response_data: &[u8],
    ) -> Result<OpenidCredentialRemoveRet, String> {
        self.proxy
            .decode_openid_credential_remove_response(response_data)
    }

    fn build_get_principal_request(
        &self,
        user_number: &UserNumber,
        frontend_hostname: &String,
    ) -> IcAgentRequestDefinition {
        self.proxy
            .build_get_principal_request(user_number, frontend_hostname)
    }

    fn decode_get_principal_response(&self, response_data: &[u8]) -> Result<Principal, String> {
        self.proxy.decode_get_principal_response(response_data)
    }

    fn build_authn_method_registration_mode_enter_request(
        &self,
        identity_number: &IdentityNumber,
        registration_id: &Option<RegistrationId>,
    ) -> IcAgentRequestDefinition {
        self.proxy
            .build_authn_method_registration_mode_enter_request(identity_number, registration_id)
    }

    fn decode_authn_method_registration_mode_enter_response(
        &self,
        response_data: &[u8],
    ) -> Result<AuthnMethodRegistrationModeEnterRet, String> {
        self.proxy
            .decode_authn_method_registration_mode_enter_response(response_data)
    }

    fn build_authn_method_confirm_request(
        &self,
        identity_number: &IdentityNumber,
        verification_code: String,
    ) -> IcAgentRequestDefinition {
        self.proxy
            .build_authn_method_confirm_request(identity_number, verification_code)
    }

    fn decode_authn_method_confirm_response(
        &self,
        response_data: &[u8],
    ) -> Result<AuthnMethodConfirmRet, String> {
        self.proxy
            .decode_authn_method_confirm_response(response_data)
    }

    fn build_prepare_delegation_request(
        &self,
        user_number: &UserNumber,
        frontend_hostname: String,
        session_key: Vec<u8>,
        delegation_duration: Duration,
    ) -> IcAgentRequestDefinition {
        self.proxy.build_prepare_delegation_request(
            user_number,
            frontend_hostname,
            session_key,
            delegation_duration,
        )
    }

    fn decode_prepare_delegation_response(
        &self,
        response_data: &[u8],
    ) -> Result<(Vec<u8>, TimestampNanos), String> {
        self.proxy.decode_prepare_delegation_response(response_data)
    }

    fn build_get_delegation_request(
        &self,
        user_number: &UserNumber,
        frontend_hostname: String,
        session_key: Vec<u8>,
        timestamp: TimestampNanos,
    ) -> CanisterRequest {
        self.proxy.build_get_delegation_request(
            user_number,
            frontend_hostname,
            session_key,
            timestamp,
        )
    }

    fn decode_get_delegation_response(
        &self,
        response_data: &[u8],
    ) -> Result<GetDelegationResponse, String> {
        self.proxy.decode_get_delegation_response(response_data)
    }

    fn get_delegation_signature_msg(
        &self,
        public_key: &[u8],
        expiration: u64,
        targets: Option<&Vec<Vec<u8>>>,
    ) -> Vec<u8> {
        self.proxy
            .get_delegation_signature_msg(public_key, expiration, targets)
    }
}
