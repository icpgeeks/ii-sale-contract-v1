use candid::Principal;

use crate::test::tests::{
    components::time::set_test_time,
    drivers::fetch::{drive_to_check_assets_finished, drive_to_hold, FetchConfig},
    HT_CAPTURED_IDENTITY_NUMBER, HT_QUARANTINE_DURATION, HT_STANDARD_CERT_EXPIRATION,
};

/// Drives the state machine all the way to
/// `HolderState::Holding { sub_state: HoldingState::Hold { .. } }`
/// using the standard test configuration:
///
/// - certificate expiration: `HT_STANDARD_CERT_EXPIRATION`
/// - identity number: `HT_CAPTURED_IDENTITY_NUMBER`
/// - fetch config: `FetchConfig::single_no_neurons()`
///
/// **Precondition:** canister state is freshly initialised (no prior `init_state` call).
/// No `test_state_matches!` assertions inside — pure navigation.
pub(crate) async fn drive_to_standard_hold(owner: Principal) {
    drive_to_hold(
        HT_STANDARD_CERT_EXPIRATION,
        owner,
        HT_CAPTURED_IDENTITY_NUMBER,
        &FetchConfig::single_no_neurons(),
    )
    .await;
}

/// Drives the state machine past the quarantine period and through a full
/// re-fetch + re-check cycle, landing back in `Hold { quarantine: None }`.
///
/// **Precondition:** state machine is in
/// `HolderState::Holding { sub_state: HoldingState::Hold { quarantine: Some(..), .. } }`.
///
/// **Postcondition:** state machine is in
/// `HolderState::Holding { sub_state: HoldingState::Hold { quarantine: None, .. } }`.
///
/// No `test_state_matches!` assertions inside — pure navigation.
/// Use `test_state_matches!` in the calling test to verify the expected state if needed.
pub(crate) async fn drive_after_quarantine(config: &FetchConfig) {
    // Advance time beyond the quarantine window.
    set_test_time(HT_QUARANTINE_DURATION + 1);

    // Hold → StartFetchAssets  (one processing tick triggers the quarantine expiry check)
    super::super::tick().await;

    // Drive through the full fetch + check asset phases.
    drive_to_check_assets_finished(config).await;
    // State: FinishCheckAssets

    // FinishCheckAssets → ValidateAssets
    super::super::tick().await;

    // ValidateAssets → Hold (quarantine: None)
    super::super::tick().await;
}
