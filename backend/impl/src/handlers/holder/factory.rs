use crate::components::Environment;
use crate::handlers::holder::states::{
    exit_and_register_holder_authn_method, register_holder_authn_method_session,
};
use contract_canister_api::types::holder::{CaptureState, HolderState::*, ReleaseState};

use super::processor::Processor;
use crate::model::holder::HolderLock;
use crate::{
    handlers::holder::states::{
        check_confirmation_holder_registration_expiry,
        check_confirmation_owner_registration_expiry, confirm_authn_method_registration,
        create_ecdsa_key, delete_holder_authn_method, delete_identity_authn_methods,
        enter_authn_method_registration_mode, exit_orphaned_registration_mode, finish_capture,
        get_holder_contract_principal, obtain_identity_authn_methods, process_holding_state,
        sleep_processing, start_capture, start_release,
    },
    processor_toolkit, read_state,
};

pub(crate) fn get_processor<'a>() -> Processor<'a> {
    let holder_state = read_state(|state| {
        state
            .get_model()
            .get_holder()
            .get_holder_model()
            .state
            .value
            .clone()
    });

    match holder_state {
        WaitingActivation => processor_toolkit!(sleep_processing),
        WaitingStartCapture => processor_toolkit!(sleep_processing),
        Capture { sub_state } => get_capture_processor(sub_state),
        Holding { .. } => processor_toolkit!(process_holding_state),
        Release { sub_state, .. } => get_releasing_processor(sub_state),
        Closed { .. } => processor_toolkit!(sleep_processing),
    }
}

fn get_capture_processor<'a>(capture_state: CaptureState) -> Processor<'a> {
    match capture_state {
        CaptureState::StartCapture => processor_toolkit!(start_capture),
        CaptureState::CreateEcdsaKey => processor_toolkit!(create_ecdsa_key),
        CaptureState::RegisterAuthnMethodSession => {
            processor_toolkit!(register_holder_authn_method_session)
        }
        CaptureState::NeedConfirmAuthnMethodSessionRegistration { .. } => {
            processor_toolkit!(check_confirmation_holder_registration_expiry)
        }
        CaptureState::ExitAndRegisterHolderAuthnMethod { .. } => {
            processor_toolkit!(exit_and_register_holder_authn_method)
        }
        CaptureState::GetHolderContractPrincipal { .. } => {
            processor_toolkit!(get_holder_contract_principal)
        }
        CaptureState::ObtainingIdentityAuthnMethods => {
            processor_toolkit!(obtain_identity_authn_methods)
        }
        CaptureState::DeletingIdentityAuthnMethods { .. } => {
            processor_toolkit!(delete_identity_authn_methods)
        }
        CaptureState::NeedDeleteProtectedIdentityAuthnMethod { .. } => {
            processor_toolkit!(sleep_processing)
        }
        CaptureState::FinishCapture => processor_toolkit!(finish_capture),
        CaptureState::CaptureFailed { .. } => {
            processor_toolkit!(sleep_processing)
        }
    }
}

fn get_releasing_processor<'a>(release_state: ReleaseState) -> Processor<'a> {
    match release_state {
        ReleaseState::StartRelease => processor_toolkit!(start_release),
        ReleaseState::EnterAuthnMethodRegistrationMode { .. } => {
            processor_toolkit!(enter_authn_method_registration_mode)
        }
        ReleaseState::WaitingAuthnMethodRegistration { .. } => {
            processor_toolkit!(check_confirmation_owner_registration_expiry)
        }
        ReleaseState::ConfirmAuthnMethodRegistration { .. } => {
            processor_toolkit!(confirm_authn_method_registration)
        }
        ReleaseState::CheckingAccessFromOwnerAuthnMethod => {
            processor_toolkit!(sleep_processing)
        }
        ReleaseState::DangerousToLoseIdentity => processor_toolkit!(sleep_processing),
        ReleaseState::IdentityAPIChanged => processor_toolkit!(sleep_processing),
        ReleaseState::DeleteHolderAuthnMethod => {
            processor_toolkit!(delete_holder_authn_method)
        }
        ReleaseState::EnsureOrphanedRegistrationExited { .. } => {
            processor_toolkit!(exit_orphaned_registration_mode)
        }
        ReleaseState::ReleaseFailed { .. } => {
            processor_toolkit!(sleep_processing)
        }
    }
}
