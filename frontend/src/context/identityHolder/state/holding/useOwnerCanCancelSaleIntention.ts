import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useMemo} from 'react';
import {useIdentityHolderSaleStatus} from './useIdentityHolderSaleStatus';

export const useOwnerCanCancelSaleIntention = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const saleStatus = useIdentityHolderSaleStatus();

    return useMemo<boolean>(() => {
        if (!isOwnedByCurrentUser) {
            return false;
        }
        if (saleStatus.type == 'listed') {
            return true;
        }
        return false;
    }, [isOwnedByCurrentUser, saleStatus]);
};
