import {useCertificateExpirationStatus} from 'frontend/src/context/certificate/useCertificateExpirationStatus';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useMemo} from 'react';
import {useIdentityHolderSaleStatus} from './useIdentityHolderSaleStatus';

export const useOwnerCanSetSaleIntention = () => {
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
        return saleStatus.type == 'saleIntentionNotSet';
    }, [isOwnedByCurrentUser, saleStatus, certificateExpirationStatusType]);
};
