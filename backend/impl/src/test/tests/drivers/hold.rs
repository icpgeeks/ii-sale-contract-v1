use crate::test::tests::{
    components::time::set_test_time,
    drivers::fetch::{drive_to_check_assets_finished, FetchConfig},
    HT_QUARANTINE_DURATION,
};

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
