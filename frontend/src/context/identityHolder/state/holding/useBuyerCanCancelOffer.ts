import {nonNullish} from '@dfinity/utils';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useMemo} from 'react';
import {findBuyerOffer} from '../../identityHolderUtils';
import {useIdentityHolderSaleStatus} from './useIdentityHolderSaleStatus';

export const useBuyerCanCancelOffer = () => {
    const {isAuthenticated, principal} = useAuthContext();
    const saleStatus = useIdentityHolderSaleStatus();

    return useMemo<boolean>(() => {
        if (!isAuthenticated) {
            return false;
        }
        if (saleStatus.type != 'listed') {
            return false;
        }
        if (saleStatus.currentUserRole !== 'guest') {
            return false;
        }
        const buyerOffer = findBuyerOffer(saleStatus.saleDeal, principal);
        const buyerOfferExists = nonNullish(buyerOffer);
        return buyerOfferExists;
    }, [principal, isAuthenticated, saleStatus]);
};
