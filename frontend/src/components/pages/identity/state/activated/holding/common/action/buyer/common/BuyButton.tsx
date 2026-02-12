import {Modal} from 'antd';
import {ConnectModal} from 'frontend/src/components/pages/auth/modal/ConnectModal';
import {ConnectModalDataProvider} from 'frontend/src/components/pages/auth/modal/ConnectModalDataProvider';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useBuyerCanSetOffer} from 'frontend/src/context/identityHolder/state/holding/useBuyerCanSetOffer';
import {i18} from 'frontend/src/i18';
import type {MouseEvent} from 'react';
import {useCallback, useState} from 'react';
import {BuyNowModal} from '../buyNow/modal/BuyNowModal';
import {BuyNowModalDataProvider} from '../buyNow/modal/BuyNowModalDataProvider';

export const BuyButton = () => {
    const buyerCanSetOffer = useBuyerCanSetOffer(true);
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

    const label = i18.holder.state.holding.common.topPanel.action.guest.buy;

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
            <PrimaryButton onClick={onClick} block>
                {label}
            </PrimaryButton>
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
        <BuyNowModalDataProvider onCancelModal={onCancelModal}>
            <BuyNowModal />
        </BuyNowModalDataProvider>
    );
};
