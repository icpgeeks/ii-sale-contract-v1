import {Modal} from 'antd';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useBuyerCanCancelOffer} from 'frontend/src/context/identityHolder/state/holding/useBuyerCanCancelOffer';
import PubSub from 'pubsub-js';
import {useCallback, useEffect, useState} from 'react';
import {CancelBuyerOfferModal} from './CancelBuyerOfferModal';
import {CancelBuyerOfferModalDataProvider} from './CancelBuyerOfferModalDataProvider';

const OPEN_CANCEL_BUYER_OFFER_MODAL_NOTIFICATION = 'OPEN_CANCEL_BUYER_OFFER_MODAL_NOTIFICATION';

export const CancelBuyerOfferModalRenderer = () => {
    const buyerCanCancelOffer = useBuyerCanCancelOffer();

    const [open, setOpen] = useState<boolean>(false);

    const onCancelModal = useCallback(() => {
        setOpen(false);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_CANCEL_BUYER_OFFER_MODAL_NOTIFICATION, () => {
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    if (!buyerCanCancelOffer) {
        return null;
    }

    return (
        <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
            <CancelBuyerOfferModalDataProvider onCancelModal={onCancelModal}>
                <CancelBuyerOfferModal />
            </CancelBuyerOfferModalDataProvider>
        </Modal>
    );
};

export const sendOpenCancelBuyerOfferModalNotification = () => {
    PubSub.publish(OPEN_CANCEL_BUYER_OFFER_MODAL_NOTIFICATION);
};
