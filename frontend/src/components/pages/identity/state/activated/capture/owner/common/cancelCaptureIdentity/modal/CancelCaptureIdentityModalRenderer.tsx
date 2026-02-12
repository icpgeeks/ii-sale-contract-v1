import {Modal} from 'antd';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useCallback, useEffect, useState} from 'react';
import {useCancelCaptureIdentityDataContext} from '../CancelCaptureIdentityDataProvider';
import {CancelCaptureIdentityModal} from './CancelCaptureIdentityModal';
import {CancelCaptureIdentityModalDataProvider} from './CancelCaptureIdentityModalDataProvider';

const OPEN_CANCEL_CAPTURE_IDENTITY_MODAL_NOTIFICATION = 'OPEN_CANCEL_CAPTURE_IDENTITY_MODAL_NOTIFICATION';

export const CancelCaptureIdentityModalRenderer = () => {
    const {ownerCanCancelCapture} = useCancelCaptureIdentityDataContext();

    const [open, setOpen] = useState<boolean>(false);

    const onCancelModal = useCallback(() => {
        setOpen(false);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_CANCEL_CAPTURE_IDENTITY_MODAL_NOTIFICATION, () => {
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    if (!ownerCanCancelCapture.ownerCanCancelCapture) {
        return null;
    }

    return (
        <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
            <CancelCaptureIdentityModalDataProvider onCancelModal={onCancelModal}>
                <CancelCaptureIdentityModal />
            </CancelCaptureIdentityModalDataProvider>
        </Modal>
    );
};

export const sendOpenCancelCaptureIdentityModalNotification = () => {
    PubSub.publish(OPEN_CANCEL_CAPTURE_IDENTITY_MODAL_NOTIFICATION);
};
