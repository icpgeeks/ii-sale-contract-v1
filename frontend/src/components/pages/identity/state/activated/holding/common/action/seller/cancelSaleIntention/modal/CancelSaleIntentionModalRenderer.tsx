import {Modal} from 'antd';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useOwnerCanCancelSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanCancelSaleIntention';
import PubSub from 'pubsub-js';
import {useCallback, useEffect, useState} from 'react';
import {CancelSaleIntentionModal} from './CancelSaleIntentionModal';
import {CancelSaleIntentionModalDataProvider} from './CancelSaleIntentionModalDataProvider';

const OPEN_CANCEL_SALE_OFFER_MODAL_NOTIFICATION = 'OPEN_CANCEL_SALE_OFFER_MODAL_NOTIFICATION';

export const CancelSaleIntentionModalRenderer = (props: {allowAlways?: boolean}) => {
    const {allowAlways = false} = props;
    const ownerCanCancelSaleIntention = useOwnerCanCancelSaleIntention();

    const [open, setOpen] = useState<boolean>(false);

    const onCancelModal = useCallback(() => {
        setOpen(false);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_CANCEL_SALE_OFFER_MODAL_NOTIFICATION, () => {
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    if (!allowAlways) {
        if (!ownerCanCancelSaleIntention) {
            return null;
        }
    }

    return (
        <>
            <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
                <CancelSaleIntentionModalDataProvider onCancelModal={onCancelModal} onOkModal={onCancelModal} allowAlways={allowAlways}>
                    <CancelSaleIntentionModal source="manual" />
                </CancelSaleIntentionModalDataProvider>
            </Modal>
        </>
    );
};

export const sendOpenCancelSaleOfferModalNotification = () => {
    PubSub.publish(OPEN_CANCEL_SALE_OFFER_MODAL_NOTIFICATION);
};
