import {Modal} from 'antd';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import PubSub from 'pubsub-js';
import {useCallback, useEffect, useState} from 'react';
import {AddControllerModal} from './AddControllerModal';
import {AddControllerModalDataProvider} from './AddControllerModalDataProvider';
import {AddControllerModalFormDataProvider} from './AddControllerModalFormDataProvider';

const OPEN_ADD_CONTROLLER_MODAL_NOTIFICATION = 'OPEN_ADD_CONTROLLER_MODAL_NOTIFICATION';

export const AddControllerModalRenderer = () => {
    const [open, setOpen] = useState<boolean>(false);

    const onCancelModal = useCallback(() => {
        setOpen(false);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_ADD_CONTROLLER_MODAL_NOTIFICATION, () => {
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    return (
        <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
            <AddControllerModalFormDataProvider>
                <AddControllerModalDataProvider onCancelModal={onCancelModal}>
                    <AddControllerModal />
                </AddControllerModalDataProvider>
            </AddControllerModalFormDataProvider>
        </Modal>
    );
};

export const sendOpenAddControllerModalNotification = () => {
    PubSub.publish(OPEN_ADD_CONTROLLER_MODAL_NOTIFICATION);
};
