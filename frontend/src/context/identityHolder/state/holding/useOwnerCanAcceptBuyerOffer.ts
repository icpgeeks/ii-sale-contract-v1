import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {useMemo} from 'react';
import {useIdentityHolderSaleStatus} from './useIdentityHolderSaleStatus';

export const useOwnerCanAcceptBuyerOffer = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const saleStatus = useIdentityHolderSaleStatus();

    return useMemo<boolean>(() => {
        if (!isOwnedByCurrentUser) {
            return false;
        }
        if (saleStatus.type == 'noData' || saleStatus.type == 'saleIntentionNotSet') {
            return false;
        }
        const {saleDealState} = saleStatus;
        return hasProperty(saleDealState, 'Trading');
    }, [isOwnedByCurrentUser, saleStatus]);
};
