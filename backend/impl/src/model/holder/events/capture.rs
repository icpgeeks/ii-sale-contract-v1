use common_canister_types::{TimestampMillis, Timestamped};
use contract_canister_api::types::holder::{
    CaptureError, CaptureProcessingEvent, CaptureState, CheckAssetsState, FetchAssetsState,
    HolderState, HoldingState, ReleaseInitiation, ReleaseState,
};

use crate::{
    model::holder::{HolderModel, UpdateHolderError},
    state_matches,
};

pub(crate) fn handle_capture_event(
    model: &mut HolderModel,
    time: TimestampMillis,
    event: &CaptureProcessingEvent,
) -> Result<(), UpdateHolderError> {
    match event {
        CaptureProcessingEvent::CaptureStarted => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::StartCapture,
                    ..
                }
            );

            update_capture_state(model, time, CaptureState::CreateEcdsaKey);
            Ok(())
        }
        CaptureProcessingEvent::CancelCapture => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::CreateEcdsaKey
                        | CaptureState::RegisterAuthnMethodSession
                        | CaptureState::NeedConfirmAuthnMethodSessionRegistration { .. }
                        | CaptureState::CaptureFailed { .. },
                }
            );

            model.ecdsa_key = None;
            model.identity_number = None;
            model.identity_name = None;
            model.processing_error = None;
            model.state = Timestamped::new(time, HolderState::WaitingStartCapture);
            Ok(())
        }
        CaptureProcessingEvent::EcdsaKeyCreated { ecdsa_key } => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::CreateEcdsaKey,
                    ..
                }
            );
            model.ecdsa_key = Some(ecdsa_key.clone());
            update_capture_state(model, time, CaptureState::RegisterAuthnMethodSession);
            Ok(())
        }
        CaptureProcessingEvent::AuthnMethodSessionRegistered {
            confirmation_code,
            expiration,
        } => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::RegisterAuthnMethodSession,
                    ..
                }
            );

            update_capture_state(
                model,
                time,
                CaptureState::NeedConfirmAuthnMethodSessionRegistration {
                    confirmation_code: confirmation_code.clone(),
                    expiration: *expiration,
                },
            );
            Ok(())
        }
        CaptureProcessingEvent::AuthnMethodSessionRegisterError { error } => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::RegisterAuthnMethodSession,
                    ..
                }
            );
            set_capture_fail_state(model, time, error.clone());
            Ok(())
        }
        CaptureProcessingEvent::AuthnMethodSessionRegistrationExpired => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::NeedConfirmAuthnMethodSessionRegistration { .. },
                    ..
                }
            );
            set_capture_fail_state(model, time, CaptureError::SessionRegistrationModeExpired);
            Ok(())
        }
        CaptureProcessingEvent::AuthnMethodSessionRegistrationConfirmed { frontend_hostname } => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::NeedConfirmAuthnMethodSessionRegistration { .. },
                    ..
                }
            );
            update_capture_state(
                model,
                time,
                CaptureState::ExitAndRegisterHolderAuthnMethod {
                    frontend_hostname: frontend_hostname.clone(),
                },
            );
            Ok(())
        }
        CaptureProcessingEvent::HolderAuthnMethodRegistered => match &model.state.value {
            HolderState::Capture {
                sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { frontend_hostname },
                ..
            } => {
                update_capture_state(
                    model,
                    time,
                    CaptureState::GetHolderContractPrincipal {
                        frontend_hostname: frontend_hostname.clone(),
                    },
                );
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        CaptureProcessingEvent::HolderAuthnMethodRegisterError { error } => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::ExitAndRegisterHolderAuthnMethod { .. },
                    ..
                }
            );
            set_capture_fail_state(model, time, error.clone());
            Ok(())
        }
        CaptureProcessingEvent::HolderContractPrincipalIsHolderOwner => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::GetHolderContractPrincipal { .. },
                    ..
                }
            );
            model.state = Timestamped::new(
                time,
                HolderState::Release {
                    release_initiation: ReleaseInitiation::DangerousToLoseIdentity,
                    sub_state: ReleaseState::DangerousToLoseIdentity,
                },
            );
            Ok(())
        }
        CaptureProcessingEvent::HolderContractPrincipalObtained { .. } => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::GetHolderContractPrincipal { .. },
                    ..
                }
            );
            update_capture_state(model, time, CaptureState::ObtainingIdentityAuthnMethods);
            Ok(())
        }
        CaptureProcessingEvent::GetHolderContractPrincipalUnathorized => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::GetHolderContractPrincipal { .. },
                    ..
                }
            );
            set_capture_fail_state(model, time, CaptureError::HolderDeviceLost);
            Ok(())
        }
        CaptureProcessingEvent::HolderAuthnMethodLost => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::ObtainingIdentityAuthnMethods
                        | CaptureState::DeletingIdentityAuthnMethods { .. },
                    ..
                }
            );
            set_capture_fail_state(model, time, CaptureError::HolderDeviceLost);
            Ok(())
        }
        CaptureProcessingEvent::IdentityAuthnMethodProtected {
            meta_data: alias,
            public_key: pub_key,
        } => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::ObtainingIdentityAuthnMethods,
                    ..
                }
            );
            update_capture_state(
                model,
                time,
                CaptureState::NeedDeleteProtectedIdentityAuthnMethod {
                    meta_data: alias.clone(),
                    public_key: pub_key.clone(),
                },
            );
            Ok(())
        }
        CaptureProcessingEvent::ProtectedIdentityAuthnMethodDeleted => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::NeedDeleteProtectedIdentityAuthnMethod { .. },
                    ..
                }
            );
            update_capture_state(model, time, CaptureState::ObtainingIdentityAuthnMethods);
            Ok(())
        }
        CaptureProcessingEvent::IdentityAPIChangeDetected => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::ObtainingIdentityAuthnMethods,
                    ..
                }
            );
            model.state = Timestamped::new(
                time,
                HolderState::Release {
                    release_initiation: ReleaseInitiation::IdentityAPIChanged,
                    sub_state: ReleaseState::IdentityAPIChanged,
                },
            );
            Ok(())
        }
        CaptureProcessingEvent::IdentityAuthnMethodsObtained {
            authn_pubkeys,
            active_registration,
            openid_credentials,
        } => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::ObtainingIdentityAuthnMethods,
                    ..
                }
            );
            update_capture_state(
                model,
                time,
                CaptureState::DeletingIdentityAuthnMethods {
                    authn_pubkeys: authn_pubkeys.clone(),
                    active_registration: *active_registration,
                    openid_credentials: openid_credentials.clone(),
                },
            );
            Ok(())
        }
        CaptureProcessingEvent::IdentityAuthnMethodDeleted { public_key } => {
            match &mut model.state.value {
                HolderState::Capture {
                    sub_state: CaptureState::DeletingIdentityAuthnMethods { authn_pubkeys, .. },
                    ..
                } => {
                    authn_pubkeys.retain(|pk| pk != public_key);
                }
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            }
            Ok(())
        }
        CaptureProcessingEvent::IdentityAuthnMethodsResync => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::DeletingIdentityAuthnMethods { .. },
                    ..
                }
            );
            update_capture_state(model, time, CaptureState::ObtainingIdentityAuthnMethods);
            Ok(())
        }
        CaptureProcessingEvent::IdentityAuthnMethodsPartiallyDeleted => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::DeletingIdentityAuthnMethods { .. },
                    ..
                }
            );
            update_capture_state(model, time, CaptureState::ObtainingIdentityAuthnMethods);
            Ok(())
        }
        CaptureProcessingEvent::IdentityAuthnMethodRegistrationExited => {
            match &mut model.state.value {
                HolderState::Capture {
                    sub_state:
                        CaptureState::DeletingIdentityAuthnMethods {
                            active_registration,
                            ..
                        },
                    ..
                } => {
                    *active_registration = false;
                }
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            }
            Ok(())
        }
        CaptureProcessingEvent::IdentityOpenidCredentialDeleted {
            openid_credential_key,
        } => {
            match &mut model.state.value {
                HolderState::Capture {
                    sub_state:
                        CaptureState::DeletingIdentityAuthnMethods {
                            openid_credentials, ..
                        },
                    ..
                } => {
                    if let Some(keys) = openid_credentials {
                        keys.retain(|key| key != openid_credential_key);
                    }
                }
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            }
            Ok(())
        }
        CaptureProcessingEvent::IdentityAuthnMethodsDeleted { identity_name } => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::ObtainingIdentityAuthnMethods,
                    ..
                }
            );
            model.identity_name = identity_name.clone();
            update_capture_state(model, time, CaptureState::FinishCapture);
            Ok(())
        }
        CaptureProcessingEvent::CaptureFinished => {
            state_matches!(
                model,
                HolderState::Capture {
                    sub_state: CaptureState::FinishCapture,
                    ..
                }
            );

            model.holding_timestamp = Some(time);
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::FetchAssets {
                        fetch_assets_state: FetchAssetsState::StartFetchAssets,
                        wrap_holding_state: Box::new(HoldingState::CheckAssets {
                            sub_state: CheckAssetsState::StartCheckAssets,
                            wrap_holding_state: Box::new(HoldingState::StartHolding),
                        }),
                    },
                },
            );
            Ok(())
        }
    }
}

fn set_capture_fail_state(model: &mut HolderModel, time: u64, error: CaptureError) {
    update_capture_state(model, time, CaptureState::CaptureFailed { error });
}

fn update_capture_state(model: &mut HolderModel, time: TimestampMillis, sub_state: CaptureState) {
    match &model.state.value {
        HolderState::Capture { .. } => {
            model.state = Timestamped::new(time, HolderState::Capture { sub_state });
        }
        _ => panic!(),
    }
}
