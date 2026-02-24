use candid::Principal;
use common_canister_impl::{
    components::identity::api::{
        AuthnMethod, AuthnMethodData, AuthnMethodProtection, AuthnMethodPurpose,
        AuthnMethodSecuritySettings, MetadataMapV2, WebAuthn,
    },
    handlers::ic_request::public_key::uncompressed_public_key_to_asn1_block,
};
use common_canister_types::TimestampMillis;
use common_contract_api::activate_contract::{ActivateContractArgs, CheckPermissionStrategy};

use crate::{
    result_ok_with_holder_information,
    test::tests::{
        components::{ecdsa::PUBLIC_KEY, ic::set_test_caller},
        ht_get_test_deployer, ht_get_test_hub_canister, ht_init_test_contract,
        support::mocks::{
            mock_authn_method_register_ok, mock_authn_method_registration_mode_exit_ok,
            mock_identity_info_ok, mock_obtain_hub_canister_ok,
        },
        TEST_AUTHN_CONFIRMATION_CODE, TEST_AUTHN_REGISTER_EXPIRATION_NANOS, TEST_CAPTURE_HOSTNAME,
    },
    updates::contract::activate_contract::activate_contract_int,
    updates::holder::{
        confirm_holder_authn_method_registration::confirm_holder_authn_method_registration_int,
        start_capture_identity::start_capture_identity_int,
    },
};

/// Drives the state machine from initial state all the way to
/// `HolderState::Holding { sub_state: HoldingState::FetchAssets { StartFetchAssets } }`.
///
/// This is a pure navigation function — no `test_state_matches!` assertions inside.
/// Use it in tests that need to reach the fetch-assets phase without caring about
/// the intermediate capture steps.
pub(crate) async fn drive_to_captured(
    certificate_expiration: TimestampMillis,
    owner: Principal,
    identity_number: u64,
) {
    // --- Init & activate contract ---
    ht_init_test_contract(certificate_expiration, None);
    set_test_caller(ht_get_test_deployer());
    activate_contract_int(ActivateContractArgs {
        check_permission_strategy: CheckPermissionStrategy::CheckCallerIsDeployer,
        contract_owner: owner,
    })
    .await
    .expect("activate_contract_int failed in drive_to_captured");

    // --- Start capture ---
    set_test_caller(ht_get_test_deployer());
    start_capture_identity_int(identity_number)
        .await
        .expect("start_capture_identity_int failed in drive_to_captured");

    // Two processing ticks: WaitingStartCapture → StartCapture → RegisterAuthnMethodSession
    super::super::tick().await;
    super::super::tick().await;

    // --- Register authn method session (IC agent call) ---
    mock_authn_method_register_ok(
        TEST_AUTHN_CONFIRMATION_CODE,
        TEST_AUTHN_REGISTER_EXPIRATION_NANOS,
    );
    super::super::tick().await;

    // --- Confirm authn method registration ---
    let hostname = TEST_CAPTURE_HOSTNAME.to_owned();
    let result = confirm_holder_authn_method_registration_int(hostname).await;
    let _ = result_ok_with_holder_information!(result);

    // --- Exit authn method registration mode (IC agent call) ---
    mock_authn_method_registration_mode_exit_ok();
    super::super::tick().await;

    // --- Register holder authn method on hub (IC agent call: returns hub canister) ---
    mock_obtain_hub_canister_ok(ht_get_test_hub_canister());
    super::super::tick().await;

    // --- Obtain identity authn methods (IC agent call: returns IdentityInfo) ---
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
    super::super::tick().await;

    // --- Finish capture → enter Holding/FetchAssets/StartFetchAssets ---
    super::super::tick().await;
}
