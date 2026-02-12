import {isNullish} from '@dfinity/utils';
import {SimpleSteps} from 'frontend/src/components/pages/common/SimpleSteps';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {useMemo} from 'react';

type Step = 1 | 2 | 3;

export const CaptureStepsRow = () => {
    const {getStateUnion, stateUnion} = useIdentityHolderStateContext();
    const isWaitingStartCapture = stateUnion?.type == 'WaitingStartCapture';
    const captureStateUnion = getStateUnion('Capture');

    const captureSubStateType = captureStateUnion?.type;

    const currentStep = useMemo<Step | undefined>(() => {
        if (isWaitingStartCapture) {
            return 1;
        }
        if (isNullish(captureSubStateType)) {
            return undefined;
        }
        switch (captureSubStateType) {
            case 'StartCapture':
            case 'CreateEcdsaKey':
            case 'RegisterAuthnMethodSession': {
                return 1;
            }
            case 'NeedConfirmAuthnMethodSessionRegistration':
            case 'ExitAndRegisterHolderAuthnMethod': {
                return 2;
            }
            case 'GetHolderContractPrincipal':
            case 'ObtainingIdentityAuthnMethods':
            case 'DeletingIdentityAuthnMethods':
            case 'NeedDeleteProtectedIdentityAuthnMethod':
            case 'FinishCapture': {
                return 3;
            }
            case 'CaptureFailed': {
                return undefined;
            }
            default: {
                const exhaustiveCheck: never = captureSubStateType;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                return undefined;
            }
        }
    }, [isWaitingStartCapture, captureSubStateType]);

    if (isNullish(currentStep)) {
        return null;
    }

    return <CaptureStepsRowRaw current={currentStep} />;
};

export const CaptureStepsRowRaw = ({current}: {current: number}) => {
    return <SimpleSteps total={4} current={current} />;
};
