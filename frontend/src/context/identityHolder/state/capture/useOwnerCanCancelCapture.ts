import {isNullish} from '@dfinity/utils';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {useMemo} from 'react';

type Result = {ownerCanCancelCapture: boolean; ownerCanSeeCancelCaptureAction: boolean};
export const useOwnerCanCancelCapture = (): Result => {
    const {isOwnedByCurrentUser, hasProcessingError} = useIdentityHolderContextSafe();
    const {getStateUnion} = useIdentityHolderStateContext();
    const captureStateUnion = useMemo(() => getStateUnion('Capture'), [getStateUnion]);
    return useMemo<Result>(() => {
        const defaultResult: Result = {ownerCanCancelCapture: false, ownerCanSeeCancelCaptureAction: false};
        if (!isOwnedByCurrentUser) {
            return defaultResult;
        }
        const captureSubStateType = captureStateUnion?.type;
        if (isNullish(captureSubStateType)) {
            return defaultResult;
        }
        switch (captureSubStateType) {
            case 'StartCapture':
            case 'CreateEcdsaKey':
            case 'RegisterAuthnMethodSession':
                return {ownerCanCancelCapture: hasProcessingError, ownerCanSeeCancelCaptureAction: hasProcessingError};
            case 'NeedConfirmAuthnMethodSessionRegistration':
            case 'CaptureFailed': {
                return {ownerCanCancelCapture: true, ownerCanSeeCancelCaptureAction: true};
            }
            case 'ExitAndRegisterHolderAuthnMethod': {
                return {ownerCanCancelCapture: false, ownerCanSeeCancelCaptureAction: true};
            }
            case 'ObtainingIdentityAuthnMethods':
            case 'DeletingIdentityAuthnMethods':
            case 'FinishCapture':
            case 'GetHolderContractPrincipal':
            case 'NeedDeleteProtectedIdentityAuthnMethod': {
                return defaultResult;
            }
            default: {
                const exhaustiveCheck: never = captureSubStateType;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                return defaultResult;
            }
        }
    }, [isOwnedByCurrentUser, hasProcessingError, captureStateUnion?.type]);
};
