import {Modal} from 'antd';
import {ConnectModal} from 'frontend/src/components/pages/auth/modal/ConnectModal';
import {ConnectModalDataProvider} from 'frontend/src/components/pages/auth/modal/ConnectModalDataProvider';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useBuyerCanSetOffer} from 'frontend/src/context/identityHolder/state/holding/useBuyerCanSetOffer';
import {useIdentityHolderCurrentUserBuyerOffer} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderCurrentUserBuyerOffer';
import {i18} from 'frontend/src/i18';
import PubSub from 'pubsub-js';
import type {MouseEvent} from 'react';
import {useCallback, useEffect, useState} from 'react';
import {CancelBuyerOfferModalRenderer} from '../cancelBuyerOffer/modal/CancelBuyerOfferModalRenderer';
import {SetBuyerOfferModal} from '../setBuyerOffer/modal/SetBuyerOfferModal';
import {SetBuyerOfferModalDataProvider} from '../setBuyerOffer/modal/SetBuyerOfferModalDataProvider';
import {SetBuyerOfferModalFormDataProvider} from '../setBuyerOffer/modal/SetBuyerOfferModalFormDataProvider';

const OPEN_SET_OFFER_MODAL_NOTIFICATION = 'OPEN_SET_OFFER_MODAL_NOTIFICATION';

export const MakeOfferButton = () => {
    const buyerCanSetOffer = useBuyerCanSetOffer(true);

    const {status} = useIdentityHolderCurrentUserBuyerOffer();
    const hasBuyerOffer = status.type == 'buyerOffer';

    const [open, setOpen] = useState<boolean>(false);

    const onClick = useCallback((event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
        return false;
    }, []);

    const onCancelModal = useCallback(() => {
        setOpen(false);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_SET_OFFER_MODAL_NOTIFICATION, () => {
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    const label = hasBuyerOffer ? i18.holder.state.holding.common.topPanel.action.guest.editOffer : i18.holder.state.holding.common.topPanel.action.guest.makeOffer;

    if (!buyerCanSetOffer) {
        return (
            <DefaultButton disabled block>
                {label}
            </DefaultButton>
        );
    }

    return (
        <>
            <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
                <ModalContent onCancelModal={onCancelModal} />
            </Modal>
            <DefaultButton onClick={onClick} block>
                {label}
            </DefaultButton>
            <CancelBuyerOfferModalRenderer />
        </>
    );
};

const ModalContent = ({onCancelModal}: {onCancelModal: () => void}) => {
    const {isAuthenticated} = useAuthContext();

    if (!isAuthenticated) {
        return (
            <ConnectModalDataProvider onCancelModal={onCancelModal}>
                <ConnectModal />
            </ConnectModalDataProvider>
        );
    }

    return (
        <SetBuyerOfferModalFormDataProvider>
            <SetBuyerOfferModalDataProvider onCancelModal={onCancelModal}>
                <SetBuyerOfferModal />
            </SetBuyerOfferModalDataProvider>
        </SetBuyerOfferModalFormDataProvider>
    );
};
export const sendOpenSetOfferModalNotification = () => {
    PubSub.publish(OPEN_SET_OFFER_MODAL_NOTIFICATION);
};
