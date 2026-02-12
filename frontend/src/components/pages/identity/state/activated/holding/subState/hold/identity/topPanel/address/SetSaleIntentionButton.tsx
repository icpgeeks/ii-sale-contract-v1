import {Modal} from 'antd';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useOwnerCanChangeSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanChangeSaleIntention';
import {useOwnerCanSetSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanSetSaleIntention';
import {i18} from 'frontend/src/i18';
import type {MouseEvent} from 'react';
import {useCallback, useState} from 'react';
import {SetSaleIntentionModal} from '../../../../../common/action/seller/setSaleIntention/modal/SetSaleIntentionModal';
import {SetSaleIntentionModalDataProvider} from '../../../../../common/action/seller/setSaleIntention/modal/SetSaleIntentionModalDataProvider';
import {SetSaleIntentionModalFormDataProvider} from '../../../../../common/action/seller/setSaleIntention/modal/SetSaleIntentionModalFormDataProvider';

export const SetSaleIntentionButton = () => {
    const ownerCanSetSaleIntention = useOwnerCanSetSaleIntention();
    const ownerCanChangeSaleIntention = useOwnerCanChangeSaleIntention();

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

    if (!ownerCanSetSaleIntention && !ownerCanChangeSaleIntention) {
        return null;
    }

    const label = ownerCanChangeSaleIntention ? i18.holder.state.holding.common.topPanel.action.owner.changePayoutAddress : i18.holder.state.holding.common.topPanel.action.owner.setPayoutAddress;
    return (
        <>
            <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
                {ownerCanSetSaleIntention || ownerCanChangeSaleIntention ? (
                    <SetSaleIntentionModalFormDataProvider>
                        <SetSaleIntentionModalDataProvider onCancelModal={onCancelModal} onOkModal={onCancelModal}>
                            <SetSaleIntentionModal />
                        </SetSaleIntentionModalDataProvider>
                    </SetSaleIntentionModalFormDataProvider>
                ) : null}
            </Modal>
            <DefaultButton onClick={onClick} block className="gf-multiline-button">
                {label}
            </DefaultButton>
        </>
    );
};
