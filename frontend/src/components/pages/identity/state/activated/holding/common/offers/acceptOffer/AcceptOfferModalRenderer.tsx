import type {Principal} from '@dfinity/principal';
import {Flex, Modal, Typography} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderHoldingHoldSubStateSaleDealStateContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderHoldingHoldSubStateSaleDealStateProvider';
import {i18} from 'frontend/src/i18';
import PubSub from 'pubsub-js';
import {useCallback, useEffect, useState} from 'react';
import {AcceptOfferModal} from './modal/AcceptOfferModal';
import {AcceptOfferModalDataProvider} from './modal/AcceptOfferModalDataProvider';

const OPEN_ACCEPT_OFFER_MODAL_NOTIFICATION = 'OPEN_ACCEPT_OFFER_MODAL_NOTIFICATION';
type Notification = {
    buyer: Principal;
};
export const AcceptOfferModalRenderer = () => {
    const [currentBuyer, setCurrentBuyer] = useState<Principal>();
    const {isOwnedByCurrentUser} = useIdentityHolderContext();
    const {state} = useIdentityHolderHoldingHoldSubStateSaleDealStateContext();
    const isTradingSaleDealState = state?.type == 'Trading';

    const [open, setOpen] = useState<boolean>(false);
    const [token, setToken] = useState<number>(0);

    const onCancelModal = useCallback(() => {
        setOpen(false);
        setToken((prev) => prev + 1);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_ACCEPT_OFFER_MODAL_NOTIFICATION, (_message, notification: Notification) => {
            setCurrentBuyer(notification.buyer);
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    if (!isOwnedByCurrentUser || !isTradingSaleDealState) {
        return null;
    }

    const key = `${token}_${currentBuyer?.toText()}`;
    return (
        <>
            <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
                <Content key={key} currentBuyer={currentBuyer} onCancelModal={onCancelModal} />
            </Modal>
        </>
    );
};

const Content = ({currentBuyer, onCancelModal}: {currentBuyer: Principal | undefined; onCancelModal: () => void}) => {
    const {fetchHolder} = useIdentityHolderContext();

    const [acceptedOfferRemoved, setAcceptedOfferRemoved] = useState<boolean>(false);

    const onAcceptedOfferRemoved = useCallback(async () => {
        setAcceptedOfferRemoved(true);
        await fetchHolder();
    }, [fetchHolder]);

    return acceptedOfferRemoved ? (
        <OfferRemovedContent onCancelModal={onCancelModal} />
    ) : (
        <AcceptOfferModalDataProvider buyer={currentBuyer} onCancelModal={onCancelModal} onAcceptedOfferRemoved={onAcceptedOfferRemoved}>
            <AcceptOfferModal />
        </AcceptOfferModalDataProvider>
    );
};

const OfferRemovedContent = ({onCancelModal}: {onCancelModal: () => void}) => {
    return (
        <Flex vertical gap={16}>
            <Typography.Title level={5}>{i18.holder.state.holding.modal.acceptOffer.title}</Typography.Title>
            <ErrorAlert message={i18.holder.state.holding.modal.acceptOffer.stub.error.offerRemoved} />
            <ModalButton onClick={onCancelModal}>{i18.common.button.closeButton}</ModalButton>
        </Flex>
    );
};

export const sendOpenAcceptOfferModalNotification = (notification: Notification) => {
    PubSub.publish(OPEN_ACCEPT_OFFER_MODAL_NOTIFICATION, notification);
};
