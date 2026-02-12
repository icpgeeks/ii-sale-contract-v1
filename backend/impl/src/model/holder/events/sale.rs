use candid::Principal;
use common_canister_types::{LedgerAccount, TimestampMillis, Timestamped, TokenE8s};
use contract_canister_api::types::holder::{
    BuyerOffer, CancelSaleDealState, CompletedSaleDeal, HolderState, HoldingState,
    ReferralRewardData, SaleDeal, SaleDealAcceptSubState, SaleDealProcessingEvent, SaleDealState,
    UnsellableReason,
};

use crate::{
    model::holder::{HolderModel, UpdateHolderError},
    state_matches,
};

pub(crate) fn handle_sale_event(
    model: &mut HolderModel,
    time: TimestampMillis,
    event: &SaleDealProcessingEvent,
) -> Result<(), UpdateHolderError> {
    match event {
        SaleDealProcessingEvent::SetSaleIntention {
            sale_deal_expiration_time,
            receiver_account,
        } => handle_set_sale_intention(model, time, sale_deal_expiration_time, receiver_account),
        SaleDealProcessingEvent::ChangeSaleIntention { receiver_account } => {
            handle_change_sale_intention(model, receiver_account)
        }
        SaleDealProcessingEvent::SetSaleOffer { price } => {
            handle_set_sale_offer(model, time, price)
        }
        SaleDealProcessingEvent::AcceptBuyerOffer {
            buyer,
            offer_amount,
        } => handle_accept_buyer_offer(model, time, buyer, offer_amount),
        SaleDealProcessingEvent::RemoveFailedBuyerOffer {
            buyer,
            offer_amount,
        } => handle_remove_failed_buyer_offer(model, buyer, offer_amount),
        SaleDealProcessingEvent::CancelSaleIntention => handle_cancel_sale_intention(model, time),
        SaleDealProcessingEvent::RefundBuyerFromTransitAccount { buyer } => {
            handle_refund_buyer_from_transit_account(model, time, buyer)
        }
        SaleDealProcessingEvent::BuyerFromTransitAccountRefunded { .. } => {
            handle_sale_deal_canceled(model, time)
        }
        SaleDealProcessingEvent::SaleDealCanceled => handle_sale_deal_canceled(model, time),
        SaleDealProcessingEvent::SaleIntentionExpired => handle_sale_intention_expired(model, time),
        SaleDealProcessingEvent::CertificateExpired => handle_certificate_expired(model, time),
        SaleDealProcessingEvent::SetBuyerOffer {
            buyer,
            offer_amount,
            approved_account,
            referral,
            previous_referral,
            expiration,
            max_buyer_offers,
        } => handle_set_buyer_offer(
            model,
            time,
            buyer,
            offer_amount,
            approved_account,
            referral,
            previous_referral,
            expiration,
            max_buyer_offers,
        ),
        SaleDealProcessingEvent::AcceptSellerOffer {
            buyer,
            approved_account,
            referral,
            previous_referral,
            price,
            expiration,
        } => handle_accept_seller_offer(
            model,
            time,
            buyer,
            price,
            approved_account,
            referral,
            previous_referral,
            expiration,
        ),
        SaleDealProcessingEvent::CancelBuyerOffer { buyer } => {
            handle_cancel_buyer_offer(model, time, buyer)
        }
        SaleDealProcessingEvent::SaleDealAcceptStarted => handle_accept_started(model, time),
        SaleDealProcessingEvent::SaleDealAmountToTransitTransferred { .. } => {
            handle_sale_deal_amount_to_transit_transferred(model, time)
        }
        SaleDealProcessingEvent::TransferSaleDealAmountToTransitFailed { .. } => {
            handle_sale_deal_amount_to_transit_transfer_failed(model, time)
        }
        SaleDealProcessingEvent::ReferralRewardDataResolved { reward_data } => {
            handle_referral_reward_data_resolved(model, time, reward_data.clone())
        }
        SaleDealProcessingEvent::ReferralRewardDataResolvingFailed { .. } => {
            handle_referral_reward_data_resolved(model, time, None)
        }
        SaleDealProcessingEvent::ReferralRewardTransferred { .. } => {
            handle_referral_reward_transferred(model, time)
        }
        SaleDealProcessingEvent::DeveloperRewardTransferred { .. } => {
            handle_developer_reward_transferred(model, time)
        }
        SaleDealProcessingEvent::HubRewardTransferred { .. } => {
            handle_hub_reward_transferred(model, time)
        }
        SaleDealProcessingEvent::SaleDealAmountToSellerTransferred { seller_amount, .. } => {
            handle_sale_deal_amount_to_seller_transferred(model, time, seller_amount)
        }
    }
}

fn handle_set_sale_intention(
    model: &mut HolderModel,
    time: TimestampMillis,
    sale_deal_expiration_time: &TimestampMillis,
    receiver_account: &LedgerAccount,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: None,
                ..
            }
        }
    );

    if sale_deal_expiration_time <= &time {
        return Err(UpdateHolderError::WrongState);
    }

    model.sale_deal = Some(SaleDeal {
        expiration_time: *sale_deal_expiration_time,
        sale_price: None,
        receiver_account: receiver_account.clone(),
        offers: vec![],
    });
    update_sale_deal_state(model, time, SaleDealState::WaitingSellOffer);
    Ok(())
}

fn handle_change_sale_intention(
    model: &mut HolderModel,
    receiver_account: &LedgerAccount,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::WaitingSellOffer | SaleDealState::Trading),
                ..
            }
        }
    );

    model.sale_deal.as_mut().unwrap().receiver_account = receiver_account.clone();
    Ok(())
}

fn handle_set_sale_offer(
    model: &mut HolderModel,
    time: TimestampMillis,
    price: &TokenE8s,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::Hold {
                    sale_deal_state: Some(SaleDealState::WaitingSellOffer | SaleDealState::Trading),
                    ..
                },
        } => {
            let sale_deal = model.sale_deal.as_mut().unwrap();
            if sale_deal.expiration_time <= time {
                return Err(UpdateHolderError::WrongState);
            }

            if sale_deal
                .offers
                .iter()
                .any(|offer| &offer.offer_amount >= price)
            {
                return Err(UpdateHolderError::WrongState);
            }

            sale_deal.sale_price = Some(Timestamped::new(time, *price));
            update_sale_deal_state(model, time, SaleDealState::Trading);
            Ok(())
        }
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn handle_accept_buyer_offer(
    model: &mut HolderModel,
    time: TimestampMillis,
    buyer: &Principal,
    offer_amount: &TokenE8s,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::Trading),
                quarantine: None,
            }
        }
    );

    if model.sale_deal.as_ref().unwrap().expiration_time <= time {
        return Err(UpdateHolderError::WrongState);
    }

    if !get_buyer_offer(model, buyer)
        .map(|offer| &offer.offer_amount == offer_amount)
        .unwrap_or(false)
    {
        return Err(UpdateHolderError::WrongState);
    }

    model.sale_deal.as_mut().unwrap().sale_price = Some(Timestamped::new(time, *offer_amount));
    accept_sale_deal(model, time, *buyer);
    Ok(())
}

fn handle_remove_failed_buyer_offer(
    model: &mut HolderModel,
    buyer: &Principal,
    offer_amount: &TokenE8s,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::Trading),
                quarantine: None,
            }
        }
    );

    if !get_buyer_offer(model, buyer)
        .map(|offer| &offer.offer_amount == offer_amount)
        .unwrap_or(false)
    {
        return Err(UpdateHolderError::WrongState);
    }

    let sale_deal = model.sale_deal.as_mut().unwrap();
    sale_deal.offers.retain(|offer| &offer.buyer != buyer);

    Ok(())
}

fn handle_cancel_sale_intention(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::Hold {
                    sale_deal_state: Some(SaleDealState::Trading | SaleDealState::WaitingSellOffer),
                    quarantine,
                },
        } => {
            model.sale_deal = None;
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::Hold {
                        sale_deal_state: None,
                        quarantine: *quarantine,
                    },
                },
            );
            Ok(())
        }
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn handle_refund_buyer_from_transit_account(
    model: &mut HolderModel,
    time: TimestampMillis,
    buyer: &Principal,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::CancelSaleDeal {
                    sub_state: CancelSaleDealState::StartCancelSaleDeal { .. },
                    wrap_holding_state,
                },
        } => {
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::CancelSaleDeal {
                        sub_state: CancelSaleDealState::RefundBuyerFromTransitAccount {
                            buyer: *buyer,
                        },
                        wrap_holding_state: wrap_holding_state.clone(),
                    },
                },
            );
            Ok(())
        }
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn handle_sale_intention_expired(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding { sub_state } => match sub_state.get_sale_deal_state() {
            Some(SaleDealState::WaitingSellOffer | SaleDealState::Trading) => {
                model.sale_deal = None;
                model.state = Timestamped::new(
                    time,
                    HolderState::Holding {
                        sub_state: HoldingState::Unsellable {
                            reason: UnsellableReason::CertificateExpired,
                        },
                    },
                );
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn handle_certificate_expired(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding { sub_state } => match sub_state.get_sale_deal_state() {
            Some(sale_deal_state @ SaleDealState::Accept { .. }) => {
                model.state = Timestamped::new(
                    time,
                    HolderState::Holding {
                        sub_state: HoldingState::CancelSaleDeal {
                            sub_state: CancelSaleDealState::StartCancelSaleDeal {
                                sale_deal_state: Box::new(sale_deal_state.clone()),
                            },
                            wrap_holding_state: Box::new(HoldingState::Unsellable {
                                reason: UnsellableReason::CertificateExpired,
                            }),
                        },
                    },
                );
                Ok(())
            }
            _ => Err(UpdateHolderError::WrongState),
        },
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn handle_sale_deal_canceled(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::CancelSaleDeal {
                    wrap_holding_state, ..
                },
        } => {
            model.sale_deal = None;
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: *wrap_holding_state.clone(),
                },
            );
            Ok(())
        }
        _ => Err(UpdateHolderError::WrongState),
    }
}

#[allow(clippy::too_many_arguments)]
fn handle_set_buyer_offer(
    model: &mut HolderModel,
    time: TimestampMillis,
    buyer: &Principal,
    offer_amount: &TokenE8s,
    approved_account: &LedgerAccount,
    referral: &Option<String>,
    previous_referral: &Option<String>,
    expiration: &TimestampMillis,
    max_buyer_offers: &usize,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::Trading),
                quarantine: None,
            }
        }
    );

    if buyer == &model.owner.as_ref().unwrap().value {
        return Err(UpdateHolderError::WrongState);
    }

    if expiration <= &time {
        return Err(UpdateHolderError::WrongState);
    }

    if expiration != &model.sale_deal.as_ref().unwrap().expiration_time {
        return Err(UpdateHolderError::WrongState);
    }

    let sale_deal = model.sale_deal.as_mut().unwrap();
    if offer_amount >= &sale_deal.get_price() {
        return Err(UpdateHolderError::WrongState);
    }

    sale_deal.offers.retain(|offer| &offer.buyer != buyer);

    if &sale_deal.offers.len() >= max_buyer_offers {
        let mut min_offer_index = 0;
        let mut min_offer_amount = sale_deal.offers[0].offer_amount;

        for i in 1..sale_deal.offers.len() {
            let offer_amount = sale_deal.offers[i].offer_amount;
            if offer_amount < min_offer_amount {
                min_offer_index = i;
                min_offer_amount = offer_amount;
            }
        }
        sale_deal.offers.remove(min_offer_index);
    }

    sale_deal.offers.push(Timestamped::new(
        time,
        BuyerOffer {
            buyer: *buyer,
            approved_account: approved_account.clone(),
            referral: previous_referral.clone().or(referral.clone()),
            offer_amount: *offer_amount,
        },
    ));

    update_sale_deal_state(model, time, SaleDealState::Trading);
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn handle_accept_seller_offer(
    model: &mut HolderModel,
    time: TimestampMillis,
    buyer: &Principal,
    price: &TokenE8s,
    approved_account: &LedgerAccount,
    referral: &Option<String>,
    previous_referral: &Option<String>,
    expiration: &TimestampMillis,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::Trading),
                quarantine: None,
            }
        }
    );

    if buyer == &model.owner.as_ref().unwrap().value {
        return Err(UpdateHolderError::WrongState);
    }

    if expiration <= &time {
        return Err(UpdateHolderError::WrongState);
    }

    let sale_deal = model.sale_deal.as_mut().unwrap();
    if expiration != &sale_deal.expiration_time {
        return Err(UpdateHolderError::WrongState);
    }

    if price != &sale_deal.get_price() {
        return Err(UpdateHolderError::WrongState);
    }

    sale_deal.offers.retain(|offer| &offer.buyer != buyer);
    sale_deal.offers.push(Timestamped::new(
        time,
        BuyerOffer {
            buyer: *buyer,
            approved_account: approved_account.clone(),
            referral: previous_referral.clone().or(referral.clone()),
            offer_amount: *price,
        },
    ));

    accept_sale_deal(model, time, *buyer);
    Ok(())
}

fn handle_cancel_buyer_offer(
    model: &mut HolderModel,
    time: TimestampMillis,
    buyer: &Principal,
) -> Result<(), UpdateHolderError> {
    if !is_trading_state(&model.state) {
        return Err(UpdateHolderError::WrongState);
    }

    model
        .sale_deal
        .as_mut()
        .unwrap()
        .offers
        .retain(|offer| &offer.buyer != buyer);

    update_sale_deal_state(model, time, SaleDealState::Trading);
    Ok(())
}

fn handle_accept_started(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::Accept {
                    sub_state: SaleDealAcceptSubState::StartAccept,
                    ..
                }),
                ..
            },
        }
    );

    update_accepted_sale_deal_state(
        model,
        time,
        SaleDealAcceptSubState::TransferSaleDealAmountToTransitAccount,
    );
    Ok(())
}

fn handle_sale_deal_amount_to_transit_transferred(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::Hold {
                    sale_deal_state:
                        Some(SaleDealState::Accept {
                            sub_state:
                                SaleDealAcceptSubState::TransferSaleDealAmountToTransitAccount,
                            buyer,
                        }),
                    quarantine: None,
                },
        } => {
            model
                .sale_deal
                .as_mut()
                .unwrap()
                .offers
                .retain(|offer| &offer.buyer == buyer);

            let sub_state = if get_buyer_offer(model, buyer).unwrap().referral.is_some() {
                SaleDealAcceptSubState::ResolveReferralRewardData
            } else {
                SaleDealAcceptSubState::TransferReferralReward { reward_data: None }
            };

            update_accepted_sale_deal_state(model, time, sub_state);
            Ok(())
        }
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn handle_sale_deal_amount_to_transit_transfer_failed(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::Hold {
                    sale_deal_state:
                        Some(SaleDealState::Accept {
                            sub_state:
                                SaleDealAcceptSubState::TransferSaleDealAmountToTransitAccount,
                            buyer,
                        }),
                    ..
                },
        } => {
            model
                .sale_deal
                .as_mut()
                .unwrap()
                .offers
                .retain(|offer| &offer.buyer != buyer);

            update_sale_deal_state(model, time, SaleDealState::Trading);
            Ok(())
        }
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn handle_referral_reward_data_resolved(
    model: &mut HolderModel,
    time: TimestampMillis,
    reward_data: Option<ReferralRewardData>,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::Accept {
                    sub_state: SaleDealAcceptSubState::ResolveReferralRewardData,
                    ..
                }),
                ..
            },
        }
    );

    update_accepted_sale_deal_state(
        model,
        time,
        SaleDealAcceptSubState::TransferReferralReward { reward_data },
    );
    Ok(())
}

fn handle_referral_reward_transferred(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::Accept {
                    sub_state: SaleDealAcceptSubState::TransferReferralReward { .. },
                    ..
                }),
                ..
            },
        }
    );

    update_accepted_sale_deal_state(model, time, SaleDealAcceptSubState::TransferDeveloperReward);
    Ok(())
}

fn handle_developer_reward_transferred(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::Accept {
                    sub_state: SaleDealAcceptSubState::TransferDeveloperReward,
                    ..
                }),
                ..
            },
        }
    );

    update_accepted_sale_deal_state(model, time, SaleDealAcceptSubState::TransferHubReward);
    Ok(())
}

fn handle_hub_reward_transferred(
    model: &mut HolderModel,
    time: TimestampMillis,
) -> Result<(), UpdateHolderError> {
    state_matches!(
        model,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::Accept {
                    sub_state: SaleDealAcceptSubState::TransferHubReward,
                    ..
                }),
                ..
            },
        }
    );

    update_accepted_sale_deal_state(
        model,
        time,
        SaleDealAcceptSubState::TransferSaleDealAmountToSellerAccount,
    );
    Ok(())
}

fn handle_sale_deal_amount_to_seller_transferred(
    model: &mut HolderModel,
    time: TimestampMillis,
    seller_amount: &TokenE8s,
) -> Result<(), UpdateHolderError> {
    match &model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::Hold {
                    sale_deal_state:
                        Some(SaleDealState::Accept {
                            sub_state: SaleDealAcceptSubState::TransferSaleDealAmountToSellerAccount,
                            buyer,
                        }),
                    quarantine: None,
                },
        } => {
            let offer = get_buyer_offer(model, buyer).unwrap();

            model.completed_sale_deal = Some(CompletedSaleDeal {
                assets: model.assets.as_ref().unwrap().clone(),
                seller: model.owner.as_ref().unwrap().value,
                seller_account: model.sale_deal.as_ref().unwrap().receiver_account.clone(),
                buyer: *buyer,
                buyer_account: offer.approved_account.clone(),
                price: model.sale_deal.as_ref().unwrap().get_price(),
                seller_transfer: Timestamped::new(time, *seller_amount),
            });
            model.sale_deal = None;
            model.owner = Some(Timestamped::new(time, *buyer));
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::Unsellable {
                        reason: UnsellableReason::SaleDealCompleted,
                    },
                },
            );
            Ok(())
        }
        _ => Err(UpdateHolderError::WrongState),
    }
}

fn update_sale_deal_state(
    model: &mut HolderModel,
    time: TimestampMillis,
    sale_process_state: SaleDealState,
) {
    match model.state.value {
        HolderState::Holding {
            sub_state: HoldingState::Hold { quarantine, .. },
        } => {
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::Hold {
                        quarantine,
                        sale_deal_state: Some(sale_process_state),
                    },
                },
            );
        }
        _ => panic!(),
    }
}

fn accept_sale_deal(model: &mut HolderModel, time: TimestampMillis, buyer: Principal) {
    update_sale_deal_state(
        model,
        time,
        SaleDealState::Accept {
            buyer,
            sub_state: SaleDealAcceptSubState::StartAccept,
        },
    );
}

fn update_accepted_sale_deal_state(
    model: &mut HolderModel,
    time: TimestampMillis,
    accept_sub_state: SaleDealAcceptSubState,
) {
    match model.state.value {
        HolderState::Holding {
            sub_state:
                HoldingState::Hold {
                    quarantine,
                    sale_deal_state: Some(SaleDealState::Accept { buyer, .. }),
                },
        } => {
            model.state = Timestamped::new(
                time,
                HolderState::Holding {
                    sub_state: HoldingState::Hold {
                        quarantine,
                        sale_deal_state: Some(SaleDealState::Accept {
                            buyer,
                            sub_state: accept_sub_state,
                        }),
                    },
                },
            );
        }
        _ => panic!(),
    }
}

pub(crate) fn is_trading_state(state: &HolderState) -> bool {
    matches!(
        state,
        HolderState::Holding {
            sub_state: HoldingState::Hold {
                sale_deal_state: Some(SaleDealState::Trading),
                ..
            }
        }
    )
}

pub(crate) fn get_buyer_offer<'a>(
    model: &'a HolderModel,
    caller: &'a Principal,
) -> Option<&'a Timestamped<BuyerOffer>> {
    model
        .sale_deal
        .as_ref()
        .and_then(|sale_deal| sale_deal.offers.iter().find(|b| &b.buyer == caller))
}
