import {fromNullable, isNullish, nonNullish} from '@dfinity/utils';
import {getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import type {UnsellableReason} from 'src/declarations/contract/contract.did';
import {applicationLogger} from '../logger/logger';
import {exhaustiveCheckFailedMessage} from '../logger/loggerConstants';
import {useIdentityHolderStateContext} from './state/IdentityHolderStateProvider';

export const useUnsellableBadReason = () => {
    const {stateUnion, getSubStateValue} = useIdentityHolderStateContext();
    const unsellableSubState = getSubStateValue('Holding', 'Unsellable');
    if (nonNullish(unsellableSubState)) {
        return isUnsellableBadReason(unsellableSubState.reason);
    } else if (stateUnion?.type == 'Closed') {
        return isUnsellableBadReason(fromNullable(stateUnion.state.unsellable_reason));
    }
    return false;
};

const isUnsellableBadReason = (reason: UnsellableReason | undefined): boolean => {
    const reasonUnion = getSingleEntryUnion(reason);
    if (isNullish(reasonUnion)) {
        return false;
    }
    switch (reasonUnion.type) {
        case 'CertificateExpired':
        case 'SaleDealCompleted': {
            return false;
        }
        case 'ValidationFailed':
        case 'CheckLimitFailed':
        case 'ApproveOnAccount': {
            return true;
        }
        default: {
            const exhaustiveCheck: never = reasonUnion;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return false;
        }
    }
};
