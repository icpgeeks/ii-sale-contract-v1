import {Modal} from 'antd';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import {DEFAULT_MODAL_PROPS} from 'frontend/src/components/widgets/modalUtils';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {useOwnerCanChangeSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanChangeSaleIntention';
import {useOwnerCanSetSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanSetSaleIntention';
import {useOwnerCanSetSaleOffer} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanSetSaleOffer';
import {i18} from 'frontend/src/i18';
import type {MouseEvent} from 'react';
import {useCallback, useState} from 'react';
import {AcceptOfferModalRenderer} from '../../../offers/acceptOffer/AcceptOfferModalRenderer';
import {CancelSaleIntentionModalRenderer} from '../cancelSaleIntention/modal/CancelSaleIntentionModalRenderer';
import {SetSaleIntentionModal} from '../setSaleIntention/modal/SetSaleIntentionModal';
import {SetSaleIntentionModalDataProvider} from '../setSaleIntention/modal/SetSaleIntentionModalDataProvider';
import {SetSaleIntentionModalFormDataProvider} from '../setSaleIntention/modal/SetSaleIntentionModalFormDataProvider';
import {SetSaleOfferModal} from '../setSaleOffer/modal/SetSaleOfferModal';
import {SetSaleOfferModalDataProvider} from '../setSaleOffer/modal/SetSaleOfferModalDataProvider';
import {SetSaleOfferModalFormDataProvider} from '../setSaleOffer/modal/SetSaleOfferModalFormDataProvider';

export const SellButton = () => {
    const ownerCanSetSaleIntention = useOwnerCanSetSaleIntention();
    const ownerCanChangeSaleIntention = useOwnerCanChangeSaleIntention();
    const ownerCanSetSaleOffer = useOwnerCanSetSaleOffer();

    const saleStatus = useIdentityHolderSaleStatus();
    const isListed = saleStatus.type == 'listed';

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

    const label = isListed ? i18.holder.state.holding.common.topPanel.action.owner.editListing : i18.holder.state.holding.common.topPanel.action.owner.sell;

    if (!ownerCanSetSaleIntention && !ownerCanChangeSaleIntention) {
        return null;
    }
    return (
        <>
            <Modal open={open} onCancel={onCancelModal} {...DEFAULT_MODAL_PROPS}>
                {ownerCanSetSaleIntention ? (
                    <ErrorBoundaryComponent childComponentName="SetSaleIntentionModal">
                        <SetSaleIntentionModalFormDataProvider>
                            <SetSaleIntentionModalDataProvider onCancelModal={onCancelModal}>
                                <SetSaleIntentionModal />
                            </SetSaleIntentionModalDataProvider>
                        </SetSaleIntentionModalFormDataProvider>
                    </ErrorBoundaryComponent>
                ) : null}
                {ownerCanSetSaleOffer ? (
                    <ErrorBoundaryComponent childComponentName="SetSaleOfferModal">
                        <SetSaleOfferModalFormDataProvider>
                            <SetSaleOfferModalDataProvider onCancelModal={onCancelModal}>
                                <SetSaleOfferModal />
                            </SetSaleOfferModalDataProvider>
                        </SetSaleOfferModalFormDataProvider>
                    </ErrorBoundaryComponent>
                ) : null}
            </Modal>
            {ownerCanSetSaleOffer ? <AcceptOfferModalRenderer /> : null}
            <PrimaryButton onClick={onClick} block>
                {label}
            </PrimaryButton>
            <CancelSaleIntentionModalRenderer />
        </>
    );
};
