import {fromNullable, isNullish} from '@dfinity/utils';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import type {HolderHoldingSubStateUnion} from 'frontend/src/context/identityHolder/identityHolderStateUtils';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {getSingleEntryUnion, hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {useMemo} from 'react';

export const useOwnerCanStartRelease = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const {getStateUnion} = useIdentityHolderStateContext();
    const holdingState = useMemo(() => getStateUnion('Holding'), [getStateUnion]);

    return useMemo<boolean>(() => {
        if (!isOwnedByCurrentUser) {
            return false;
        }
        return canReleaseHoldingState(holdingState);
    }, [isOwnedByCurrentUser, holdingState]);
};

const canReleaseHoldingState = (union: HolderHoldingSubStateUnion | undefined): boolean => {
    if (isNullish(union)) {
        return false;
    }
    const type = union.type;
    switch (type) {
        case 'StartHolding':
            return true;
        case 'FetchAssets': {
            const wrapHoldingStateUnion = getSingleEntryUnion(union.state.wrap_holding_state);
            return canReleaseHoldingState(wrapHoldingStateUnion);
        }
        case 'Hold': {
            const saleDealState = fromNullable(union.state.sale_deal_state);
            if (isNullish(saleDealState)) {
                return true;
            }
            return hasProperty(saleDealState, 'WaitingSellOffer');
        }
        case 'ValidateAssets': {
            const wrapHoldingStateUnion = getSingleEntryUnion(union.state.wrap_holding_state);
            return canReleaseHoldingState(wrapHoldingStateUnion);
        }
        case 'Unsellable':
            return true;
        case 'CheckAssets':
            return false;
        case 'CancelSaleDeal':
            return false;
        default: {
            const exhaustiveCheck: never = type;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return false;
        }
    }
};
