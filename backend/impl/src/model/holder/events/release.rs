use common_canister_types::{TimestampMillis, Timestamped};
use contract_canister_api::types::holder::{
    ConfirmAuthnMethodRegistrationError, HolderState, ReleaseError, ReleaseInitiation,
    ReleaseProcessingEvent::{self, *},
    ReleaseState,
};

use crate::{
    model::holder::{HolderModel, UpdateHolderError},
    state_matches,
};

pub(crate) fn handle_releasing_event(
    model: &mut HolderModel,
    time: TimestampMillis,
    event: &ReleaseProcessingEvent,
) -> Result<(), UpdateHolderError> {
    match event {
        ReleaseStarted => {
            state_matches!(
                model,
                HolderState::Release {
                    sub_state: ReleaseState::StartRelease,
                    ..
                }
            );

            update_release_state(
                model,
                time,
                ReleaseState::EnterAuthnMethodRegistrationMode {
                    registration_id: None,
                },
            );
            Ok(())
        }
        AuthnMethodRegistrationModeEntered {
            expiration,
            registration_id,
        } => {
            state_matches!(
                model,
                HolderState::Release {
                    sub_state: ReleaseState::EnterAuthnMethodRegistrationMode { .. },
                    ..
                }
            );

            update_release_state(
                model,
                time,
                ReleaseState::WaitingAuthnMethodRegistration {
                    expiration: *expiration,
                    registration_id: registration_id.clone(),
                    confirm_error: None,
                },
            );
            Ok(())
        }
        AuthnMethodRegistrationModeEnterUnathorized => {
            let release_intention = match &model.state.value {
                HolderState::Release {
                    sub_state: ReleaseState::EnterAuthnMethodRegistrationMode { .. },
                    release_initiation,
                } => release_initiation.clone(),
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            };

            finish_release(model, time, release_intention);
            Ok(())
        }
        AuthnMethodRegistrationModeEnterFail { error } => {
            state_matches!(
                model,
                HolderState::Release {
                    sub_state: ReleaseState::EnterAuthnMethodRegistrationMode { .. },
                    ..
                }
            );

            update_release_state(
                model,
                time,
                ReleaseState::ReleaseFailed {
                    error: error.clone(),
                },
            );
            Ok(())
        }
        AuthnMethodRegistrationExpired => {
            state_matches!(
                model,
                HolderState::Release {
                    sub_state: ReleaseState::WaitingAuthnMethodRegistration { .. },
                    ..
                }
            );

            update_release_state(
                model,
                time,
                ReleaseState::ReleaseFailed {
                    error: ReleaseError::AuthnMethodRegistrationExpired,
                },
            );
            Ok(())
        }
        ConfirmAuthnMethodRegistration { verification_code } => {
            let (expiration, registration_id) = match &model.state.value {
                HolderState::Release {
                    sub_state:
                        ReleaseState::WaitingAuthnMethodRegistration {
                            expiration,
                            registration_id,
                            ..
                        },
                    ..
                } => (*expiration, registration_id.clone()),
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            };

            update_release_state(
                model,
                time,
                ReleaseState::ConfirmAuthnMethodRegistration {
                    expiration,
                    registration_id,
                    verification_code: verification_code.clone(),
                },
            );

            Ok(())
        }
        AuthnMethodRegistrationConfirmed => {
            state_matches!(
                model,
                HolderState::Release {
                    sub_state: ReleaseState::ConfirmAuthnMethodRegistration { .. },
                    ..
                }
            );

            update_release_state(
                model,
                time,
                ReleaseState::CheckingAccessFromOwnerAuthnMethod,
            );

            Ok(())
        }
        AuthnMethodRegistrationModeOff | AuthnMethodRegistrationNotRegistered => {
            state_matches!(
                model,
                HolderState::Release {
                    sub_state: ReleaseState::ConfirmAuthnMethodRegistration { .. },
                    ..
                }
            );

            update_release_state(
                model,
                time,
                ReleaseState::ReleaseFailed {
                    error: ReleaseError::AuthnMethodRegistrationExpired,
                },
            );
            Ok(())
        }
        AuthnMethodRegistrationWrongCode {
            retries_left,
            verification_code,
        } => {
            let (expiration, registration_id) = match &model.state.value {
                HolderState::Release {
                    sub_state:
                        ReleaseState::ConfirmAuthnMethodRegistration {
                            expiration,
                            registration_id,
                            ..
                        },
                    ..
                } => (*expiration, registration_id.clone()),
                _ => {
                    return Err(UpdateHolderError::WrongState);
                }
            };

            update_release_state(
                model,
                time,
                ReleaseState::WaitingAuthnMethodRegistration {
                    expiration,
                    registration_id,
                    confirm_error: Some(ConfirmAuthnMethodRegistrationError {
                        verification_code: verification_code.clone(),
                        retries_left: *retries_left,
                    }),
                },
            );
            Ok(())
        }
        ReleaseRestarted { registration_id } => match model.state.value {
            HolderState::Release {
                sub_state:
                    ReleaseState::ReleaseFailed {
                        error:
                            ReleaseError::AuthnMethodRegistrationExpired
                            | ReleaseError::AuthnMethodRegistrationModeEnterInvalidRegistrationId {
                                ..
                            },
                    },
                ..
            } => {
                update_release_state(
                    model,
                    time,
                    ReleaseState::EnterAuthnMethodRegistrationMode {
                        registration_id: registration_id.clone(),
                    },
                );
                Ok(())
            }
            HolderState::Release {
                sub_state:
                    ReleaseState::CheckingAccessFromOwnerAuthnMethod
                    | ReleaseState::WaitingAuthnMethodRegistration { .. }
                    | ReleaseState::ReleaseFailed { .. },
                ..
            } => {
                update_release_state(
                    model,
                    time,
                    ReleaseState::EnsureOrphanedRegistrationExited {
                        registration_id: registration_id.clone(),
                    },
                );
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        OrphanedAuthnRegistrationModeExited => match &model.state.value {
            HolderState::Release {
                sub_state: ReleaseState::EnsureOrphanedRegistrationExited { registration_id },
                ..
            } => {
                update_release_state(
                    model,
                    time,
                    ReleaseState::EnterAuthnMethodRegistrationMode {
                        registration_id: registration_id.clone(),
                    },
                );
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        DeleteHolderAuthnMethod => {
            state_matches!(
                model,
                HolderState::Release {
                    sub_state: ReleaseState::CheckingAccessFromOwnerAuthnMethod
                        | ReleaseState::DangerousToLoseIdentity
                        | ReleaseState::IdentityAPIChanged,
                    ..
                }
            );
            update_release_state(model, time, ReleaseState::DeleteHolderAuthnMethod);
            Ok(())
        }
        HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered => {
            state_matches!(
                model,
                HolderState::Release {
                    sub_state: ReleaseState::DeleteHolderAuthnMethod,
                    ..
                }
            );
            update_release_state(
                model,
                time,
                ReleaseState::ReleaseFailed {
                    error: ReleaseError::HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered,
                },
            );
            Ok(())
        }
        HolderAuthnMethodNotFound => match &model.state.value {
            HolderState::Release {
                sub_state: ReleaseState::DeleteHolderAuthnMethod,
                release_initiation,
            } => {
                finish_release(model, time, release_initiation.clone());
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        OrphanedAuthnRegistrationModeUnauthorized => match &model.state.value {
            HolderState::Release {
                sub_state: ReleaseState::EnsureOrphanedRegistrationExited { .. },
                release_initiation,
            } => {
                finish_release(model, time, release_initiation.clone());
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        HolderAuthnMethodDeleted => match &model.state.value {
            HolderState::Release {
                sub_state: ReleaseState::DeleteHolderAuthnMethod,
                release_initiation,
            } => {
                finish_release(model, time, release_initiation.clone());
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
    }
}

fn finish_release(
    model: &mut HolderModel,
    time: TimestampMillis,
    release_initiation: ReleaseInitiation,
) {
    match release_initiation {
        ReleaseInitiation::DangerousToLoseIdentity => {
            model.reset_to_new_capture(time);
        }
        ReleaseInitiation::Manual { unsellable_reason } => {
            model.state = Timestamped::new(time, HolderState::Closed { unsellable_reason });
        }
        ReleaseInitiation::IdentityAPIChanged => {
            model.state = Timestamped::new(
                time,
                HolderState::Closed {
                    unsellable_reason: None,
                },
            );
        }
    }
}

fn update_release_state(model: &mut HolderModel, time: TimestampMillis, sub_state: ReleaseState) {
    match &model.state.value {
        HolderState::Release {
            release_initiation, ..
        } => {
            model.state = Timestamped::new(
                time,
                HolderState::Release {
                    release_initiation: release_initiation.clone(),
                    sub_state,
                },
            );
        }
        _ => panic!(),
    }
}
