import {Modal} from 'antd';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useOwnerCanCancelSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanCancelSaleIntention';
import {useOwnerCanStartRelease} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanStartRelease';
import {useCallback, useEffect, useState} from 'react';
import {CancelSaleIntentionModal} from '../cancelSaleIntention/modal/CancelSaleIntentionModal';
import {CancelSaleIntentionModalDataProvider} from '../cancelSaleIntention/modal/CancelSaleIntentionModalDataProvider';
import {StartReleaseModal} from './modal/StartReleaseModal';
import {StartReleaseModalDataProvider} from './modal/StartReleaseModalDataProvider';

const OPEN_START_RELEASE_MODAL_NOTIFICATION = 'OPEN_START_RELEASE_MODAL_NOTIFICATION';

export const StartReleaseModalRenderer = () => {
    const ownerCanStartRelease = useOwnerCanStartRelease();
    const ownerCanCancelSaleIntention = useOwnerCanCancelSaleIntention();

    const [open, setOpen] = useState<boolean>(false);
    const onCancelModal = useCallback(() => {
        setOpen(false);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_START_RELEASE_MODAL_NOTIFICATION, () => {
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    if (!ownerCanStartRelease && !ownerCanCancelSaleIntention) {
        return null;
    }

    return (
        <>
            <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
                {ownerCanCancelSaleIntention ? (
                    <CancelSaleIntentionModalDataProvider onCancelModal={onCancelModal}>
                        <CancelSaleIntentionModal source="transferFromContract" />
                    </CancelSaleIntentionModalDataProvider>
                ) : null}
                {ownerCanStartRelease ? (
                    <StartReleaseModalDataProvider onSuccessModal={onCancelModal} onCancelModal={onCancelModal}>
                        <StartReleaseModal />
                    </StartReleaseModalDataProvider>
                ) : null}
            </Modal>
        </>
    );
};

export const sendStartReleaseNotification = () => {
    PubSub.publish(OPEN_START_RELEASE_MODAL_NOTIFICATION);
};
