import {Modal} from 'antd';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useCallback, useEffect, useState} from 'react';
import {DeleteHolderAuthnMethodModal} from './DeleteHolderAuthnMethodModal';
import {DeleteHolderAuthnMethodModalDataProvider} from './DeleteHolderAuthnMethodModalDataProvider';

const OPEN_DELETE_HOLDER_AUTHN_METHOD_MODAL_NOTIFICATION = 'OPEN_DELETE_HOLDER_AUTHN_METHOD_MODAL_NOTIFICATION';

export const DeleteHolderAuthnMethodModalRenderer = () => {
    const [open, setOpen] = useState<boolean>(false);

    const onCancelModal = useCallback(() => {
        setOpen(false);
    }, []);

    useEffect(() => {
        const token = PubSub.subscribe(OPEN_DELETE_HOLDER_AUTHN_METHOD_MODAL_NOTIFICATION, () => {
            setOpen(true);
        });
        return () => {
            PubSub.unsubscribe(token);
        };
    }, []);

    return (
        <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
            <DeleteHolderAuthnMethodModalDataProvider onCancelModal={onCancelModal}>
                <DeleteHolderAuthnMethodModal />
            </DeleteHolderAuthnMethodModalDataProvider>
        </Modal>
    );
};

export const sendOpenDeleteHolderAuthnMethodModalNotification = () => {
    PubSub.publish(OPEN_DELETE_HOLDER_AUTHN_METHOD_MODAL_NOTIFICATION);
};
