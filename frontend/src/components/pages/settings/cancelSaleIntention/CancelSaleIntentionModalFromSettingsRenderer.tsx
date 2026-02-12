import {Modal} from 'antd';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import PubSub from 'pubsub-js';
import {useCallback, useEffect, useState} from 'react';
import {CancelSaleIntentionModal} from '../../identity/state/activated/holding/common/action/seller/cancelSaleIntention/modal/CancelSaleIntentionModal';
import {CancelSaleIntentionModalDataProvider} from '../../identity/state/activated/holding/common/action/seller/cancelSaleIntention/modal/CancelSaleIntentionModalDataProvider';

const OPEN_CANCEL_SALE_OFFER_MODAL_FROM_SETTINGS_NOTIFICATION = 'OPEN_CANCEL_SALE_OFFER_MODAL_FROM_SETTINGS_NOTIFICATION';

export const CancelSaleIntentionModalFromSettingsRenderer = () => {
    const [open, setOpen] = useState<boolean>(false);

    const onCancelModal = useCallback(() => {
        setOpen(false);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_CANCEL_SALE_OFFER_MODAL_FROM_SETTINGS_NOTIFICATION, () => {
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    return (
        <>
            <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
                <CancelSaleIntentionModalDataProvider onCancelModal={onCancelModal} onOkModal={onCancelModal} allowAlways>
                    <CancelSaleIntentionModal source="manual" />
                </CancelSaleIntentionModalDataProvider>
            </Modal>
        </>
    );
};

export const sendOpenCancelSaleOfferModalFromSettingsNotification = () => {
    PubSub.publish(OPEN_CANCEL_SALE_OFFER_MODAL_FROM_SETTINGS_NOTIFICATION);
};
