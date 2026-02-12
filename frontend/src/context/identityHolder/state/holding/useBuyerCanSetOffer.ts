import {nonNullish} from '@dfinity/utils';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useCertificateExpirationStatus} from 'frontend/src/context/certificate/useCertificateExpirationStatus';
import {useMemo} from 'react';
import {useIdentityHolderSaleStatus} from './useIdentityHolderSaleStatus';

export const useBuyerCanSetOffer = (allowAnonymous: boolean = false) => {
    const {isAuthenticated} = useAuthContext();
    const saleStatus = useIdentityHolderSaleStatus();
    const {status: certificateExpirationStatus} = useCertificateExpirationStatus();
    const certificateExpirationStatusType = certificateExpirationStatus?.type;
    return useMemo<boolean>(() => {
        if (!allowAnonymous) {
            if (!isAuthenticated) {
                return false;
            }
        }
        if (certificateExpirationStatusType == 'unsellable' || certificateExpirationStatusType == 'expired') {
            return false;
        }
        if (saleStatus.type != 'listed') {
            return false;
        }
        if (saleStatus.currentUserRole !== 'guest') {
            return false;
        }
        if (nonNullish(saleStatus.quarantineEndTimeMillis)) {
            return false;
        }
        return true;
    }, [isAuthenticated, saleStatus, allowAnonymous, certificateExpirationStatusType]);
};
