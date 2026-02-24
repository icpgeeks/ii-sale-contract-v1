use candid::{Encode, Principal};
use common_canister_impl::components::{
    identity::api::{
        AuthnMethodConfirmRet, AuthnMethodConfirmationCode, AuthnMethodConfirmationError,
        AuthnMethodData, AuthnMethodRegisterError, AuthnMethodRegisterRet,
        AuthnMethodRegistrationModeEnterRet, AuthnMethodRegistrationModeExitError,
        AuthnMethodRegistrationModeExitRet, AuthnMethodRemoveRet, GetAccountsError,
        GetAccountsResponse, IdentityInfo, IdentityInfoRet, MetadataMapV2,
        PrepareAccountDelegation, PrepareAccountDelegationRet,
    },
    nns::api::ListNeuronsResponse,
    nns_dap::api::{AccountDetails, GetAccountResponse},
};

use crate::test::tests::components::ic_agent::set_test_ic_agent_response;

// Constants are defined in test/mod.rs and accessible via super
use super::super::{TEST_DELEGATION_EXPIRATION, TEST_DELEGATION_KEY_1};

// ---------------------------------------------------------------------------
// Identity accounts
// ---------------------------------------------------------------------------

/// Mocks IC agent response: identity has no accounts (NoAccounts error).
pub(crate) fn mock_identity_accounts_no_accounts() {
    let m: Result<GetAccountsResponse, GetAccountsError> = Err(GetAccountsError::NoAccounts);
    set_test_ic_agent_response(Encode!(&m).unwrap());
}

/// Mocks IC agent response: identity returns the given accounts response.
pub(crate) fn mock_identity_accounts_ok(response: GetAccountsResponse) {
    let m: Result<GetAccountsResponse, GetAccountsError> = Ok(response);
    set_test_ic_agent_response(Encode!(&m).unwrap());
}

// ---------------------------------------------------------------------------
// Delegation (prepare)
// ---------------------------------------------------------------------------

/// Mocks IC agent response: prepare delegation succeeded with the given public key.
/// Uses TEST_DELEGATION_EXPIRATION as the expiration timestamp.
pub(crate) fn mock_prepare_delegation_ok(public_key: impl Into<Vec<u8>>) {
    let m: PrepareAccountDelegationRet = Ok(PrepareAccountDelegation {
        user_key: public_key.into().into(),
        expiration: TEST_DELEGATION_EXPIRATION,
    });
    set_test_ic_agent_response(Encode!(&m).unwrap());
}

/// Mocks IC agent response: prepare delegation succeeded with TEST_DELEGATION_KEY_1.
pub(crate) fn mock_prepare_delegation_ok_default() {
    mock_prepare_delegation_ok(TEST_DELEGATION_KEY_1.to_vec());
}

// ---------------------------------------------------------------------------
// Neurons
// ---------------------------------------------------------------------------

/// Mocks IC agent response: returns the given list of neuron IDs.
pub(crate) fn mock_neuron_ids(ids: Vec<u64>) {
    set_test_ic_agent_response(Encode!(&ids).unwrap());
}

/// Mocks IC agent response: returns an empty list of neuron IDs.
pub(crate) fn mock_neuron_ids_empty() {
    mock_neuron_ids(vec![]);
}

/// Mocks IC agent response: returns the given ListNeuronsResponse.
pub(crate) fn mock_neurons_response(response: &ListNeuronsResponse) {
    set_test_ic_agent_response(Encode!(response).unwrap());
}

// ---------------------------------------------------------------------------
// NNS Dapp account
// ---------------------------------------------------------------------------

/// Mocks IC agent response: the NNS Dapp account was not found.
pub(crate) fn mock_account_not_found() {
    set_test_ic_agent_response(Encode!(&GetAccountResponse::AccountNotFound).unwrap());
}

/// Mocks IC agent response: the NNS Dapp account was found with the given details.
pub(crate) fn mock_account_ok(details: AccountDetails) {
    let response = GetAccountResponse::Ok(details);
    set_test_ic_agent_response(Encode!(&response).unwrap());
}

// ---------------------------------------------------------------------------
// Capture (authn method registration)
// ---------------------------------------------------------------------------

/// Mocks IC agent response: authn method registration succeeded with the given code/expiration.
pub(crate) fn mock_authn_method_register_ok(confirmation_code: &str, expiration_nanos: u64) {
    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegisterRet::Ok(AuthnMethodConfirmationCode {
            confirmation_code: confirmation_code.to_owned(),
            expiration: expiration_nanos,
        }))
        .unwrap(),
    );
}

/// Mocks IC agent response: exit authn method registration mode succeeded.
pub(crate) fn mock_authn_method_registration_mode_exit_ok() {
    let result: Result<(), AuthnMethodRegistrationModeExitError> = Ok(());
    set_test_ic_agent_response(Encode!(&result).unwrap());
}

/// Mocks IC agent response: obtain hub canister principal succeeded with the given principal.
pub(crate) fn mock_obtain_hub_canister_ok(principal: Principal) {
    set_test_ic_agent_response(Encode!(&principal).unwrap());
}

// ---------------------------------------------------------------------------
// Release (authn method confirm / remove / mode enter-exit)
// ---------------------------------------------------------------------------

/// Mocks IC agent response: authn method confirmation succeeded.
pub(crate) fn mock_authn_method_confirm_ok() {
    set_test_ic_agent_response(Encode!(&AuthnMethodConfirmRet::Ok).unwrap());
}

/// Mocks IC agent response: authn method confirmation failed with the given error.
pub(crate) fn mock_authn_method_confirm_err(error: AuthnMethodConfirmationError) {
    set_test_ic_agent_response(Encode!(&AuthnMethodConfirmRet::Err(error)).unwrap());
}

/// Mocks IC agent response: authn method removal succeeded.
pub(crate) fn mock_authn_method_remove_ok() {
    set_test_ic_agent_response(Encode!(&AuthnMethodRemoveRet::Ok).unwrap());
}

/// Mocks IC agent response: authn method removal failed.
pub(crate) fn mock_authn_method_remove_err() {
    set_test_ic_agent_response(Encode!(&AuthnMethodRemoveRet::Err).unwrap());
}

/// Mocks IC agent response: authn method registration failed with the given error.
pub(crate) fn mock_authn_method_register_err(error: AuthnMethodRegisterError) {
    set_test_ic_agent_response(Encode!(&AuthnMethodRegisterRet::Err(error)).unwrap());
}

/// Mocks IC agent response: entering authn method registration mode succeeded with the given
/// expiration timestamp (nanoseconds).
pub(crate) fn mock_authn_method_registration_mode_enter_ok(expiration_nanos: u64) {
    set_test_ic_agent_response(
        Encode!(&AuthnMethodRegistrationModeEnterRet::Ok {
            expiration: expiration_nanos
        })
        .unwrap(),
    );
}

/// Mocks IC agent response: exiting authn method registration mode failed with the given error.
pub(crate) fn mock_authn_method_registration_mode_exit_err(
    error: AuthnMethodRegistrationModeExitError,
) {
    let result: Result<(), AuthnMethodRegistrationModeExitError> = Err(error);
    set_test_ic_agent_response(Encode!(&result).unwrap());
}

/// Mocks IC agent response: `AuthnMethodRegistrationModeExitRet::Ok(())`.
///
/// Use this when the code under test calls the exit endpoint and expects a typed
/// `AuthnMethodRegistrationModeExitRet` (not the `Result<(), ...>` variant).
pub(crate) fn mock_authn_method_registration_mode_exit_ret_ok() {
    set_test_ic_agent_response(Encode!(&AuthnMethodRegistrationModeExitRet::Ok(())).unwrap());
}

/// Mocks IC agent response: `AuthnMethodRegistrationModeExitRet::Err(error)`.
///
/// Use this when the code under test calls the exit endpoint and expects a typed
/// `AuthnMethodRegistrationModeExitRet` (not the `Result<(), ...>` variant).
pub(crate) fn mock_authn_method_registration_mode_exit_ret_err(
    error: AuthnMethodRegistrationModeExitError,
) {
    set_test_ic_agent_response(Encode!(&AuthnMethodRegistrationModeExitRet::Err(error)).unwrap());
}

// ---------------------------------------------------------------------------
// Identity info
// ---------------------------------------------------------------------------

/// Mocks IC agent response: identity info retrieved with the given authn methods.
///
/// Other fields (`metadata`, `authn_method_registration`, `openid_credentials`, `name`,
/// `created_at`) are set to sensible empty defaults.
pub(crate) fn mock_identity_info_ok(authn_methods: Vec<AuthnMethodData>) {
    set_test_ic_agent_response(
        Encode!(&IdentityInfoRet::Ok(IdentityInfo {
            authn_methods,
            metadata: Box::new(MetadataMapV2(vec![])),
            authn_method_registration: None,
            openid_credentials: None,
            name: None,
            created_at: None,
        }))
        .unwrap(),
    );
}
