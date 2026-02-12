import {useCertificateExpirationStatus} from 'frontend/src/context/certificate/useCertificateExpirationStatus';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {useMemo} from 'react';
import {useIdentityHolderSaleStatus} from './useIdentityHolderSaleStatus';

export const useOwnerCanChangeSaleIntention = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const saleStatus = useIdentityHolderSaleStatus();
    const {status: certificateExpirationStatus} = useCertificateExpirationStatus();
    const certificateExpirationStatusType = certificateExpirationStatus?.type;

    return useMemo<boolean>(() => {
        if (!isOwnedByCurrentUser) {
            return false;
        }
        if (certificateExpirationStatusType == 'unsellable' || certificateExpirationStatusType == 'expired') {
            return false;
        }
        if (saleStatus.type == 'noData' || saleStatus.type == 'saleIntentionNotSet') {
            return false;
        }
        const {saleDealState} = saleStatus;
        const isWaitingSellOffer = hasProperty(saleDealState, 'WaitingSellOffer');
        const isTrading = hasProperty(saleDealState, 'Trading');
        if (isWaitingSellOffer || isTrading) {
            return true;
        }
        return false;
    }, [isOwnedByCurrentUser, saleStatus, certificateExpirationStatusType]);
};
