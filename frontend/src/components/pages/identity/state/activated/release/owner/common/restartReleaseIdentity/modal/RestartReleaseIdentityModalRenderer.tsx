import {Modal} from 'antd';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useCallback, useEffect, useState} from 'react';
import {useRestartReleaseIdentityDataContext} from '../RestartReleaseIdentityDataProvider';
import {RestartReleaseIdentityModal} from './RestartReleaseIdentityModal';
import {RestartReleaseIdentityModalDataProvider} from './RestartReleaseIdentityModalDataProvider';

const OPEN_RESTART_RELEASE_IDENTITY_MODAL_NOTIFICATION = 'OPEN_RESTART_RELEASE_IDENTITY_MODAL_NOTIFICATION';

export const RestartReleaseIdentityModalRenderer = () => {
    const {ownerCanRestartReleaseIdentity} = useRestartReleaseIdentityDataContext();

    const [open, setOpen] = useState<boolean>(false);

    const onCancelModal = useCallback(() => {
        setOpen(false);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_RESTART_RELEASE_IDENTITY_MODAL_NOTIFICATION, () => {
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    if (!ownerCanRestartReleaseIdentity.ownerCanRestartReleaseIdentity) {
        return null;
    }

    return (
        <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
            <RestartReleaseIdentityModalDataProvider onCancelModal={onCancelModal}>
                <RestartReleaseIdentityModal />
            </RestartReleaseIdentityModalDataProvider>
        </Modal>
    );
};

export const sendOpenRestartReleaseIdentityModalNotification = () => {
    PubSub.publish(OPEN_RESTART_RELEASE_IDENTITY_MODAL_NOTIFICATION);
};
