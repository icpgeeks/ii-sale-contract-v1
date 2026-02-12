import {Modal} from 'antd';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useCallback, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {StartReleaseModal} from '../../identity/state/activated/holding/common/action/seller/startRelease/modal/StartReleaseModal';
import {StartReleaseModalDataProvider} from '../../identity/state/activated/holding/common/action/seller/startRelease/modal/StartReleaseModalDataProvider';
import {PATH_HOME} from '../../skeleton/Router';

const OPEN_START_RELEASE_MODAL_FROM_SETTINGS_NOTIFICATION = 'OPEN_START_RELEASE_MODAL_FROM_SETTINGS_NOTIFICATION';

export const StartReleaseModalFromSettingsRenderer = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState<boolean>(false);
    const onSuccessModal = useCallback(() => {
        setOpen(false);
        navigate(PATH_HOME);
    }, [navigate]);

    const onCancelModal = useCallback(() => {
        setOpen(false);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_START_RELEASE_MODAL_FROM_SETTINGS_NOTIFICATION, () => {
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    return (
        <>
            <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
                <StartReleaseModalDataProvider onSuccessModal={onSuccessModal} onCancelModal={onCancelModal} allowAlways>
                    <StartReleaseModal />
                </StartReleaseModalDataProvider>
            </Modal>
        </>
    );
};

export const sendStartReleaseFromSettingsNotification = () => {
    PubSub.publish(OPEN_START_RELEASE_MODAL_FROM_SETTINGS_NOTIFICATION);
};
