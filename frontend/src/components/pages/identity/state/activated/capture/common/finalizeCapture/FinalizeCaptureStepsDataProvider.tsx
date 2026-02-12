import {fromNullishNullable, isNullish} from '@dfinity/utils';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {createContext, useContext, useMemo, type PropsWithChildren} from 'react';
import type {CaptureState} from 'src/declarations/contract/contract.did';

type CaptureStepType = 'verifyingPrincipal' | 'protectedDeviceDetected' | 'removingDevices' | 'n/a';

type CaptureStepProto<T extends CaptureStepType> = {
    type: T;
};

type CaptureStepRemovingDevices = CaptureStepProto<'removingDevices'> & {
    passkeysLeft: number;
};

export type CaptureStep = CaptureStepProto<'verifyingPrincipal'> | CaptureStepProto<'protectedDeviceDetected'> | CaptureStepRemovingDevices | CaptureStepProto<'n/a'>;

type Context = {
    step?: CaptureStep;
};

const Context = createContext<Context | undefined>(undefined);
export const useFinalizeCaptureStepsDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useFinalizeCaptureStepsDataContext must be used within a FinalizeCaptureStepsDataProvider');
    }
    return context;
};

export const FinalizeCaptureStepsDataProvider = (props: PropsWithChildren) => {
    const {getStateSubState: getState} = useIdentityHolderStateContext();
    const captureState = useMemo(() => getState('Capture'), [getState]);

    const step: CaptureStep | undefined = useMemo(() => {
        if (isNullish(captureState)) {
            return undefined;
        }
        return getStepFromCaptureState(captureState);
    }, [captureState]);

    const value = useMemo<Context>(() => {
        return {step};
    }, [step]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};

const getStepFromCaptureState = (subState: CaptureState): CaptureStep => {
    const defaultResult: CaptureStep = {type: 'n/a'};
    const union = getSingleEntryUnion(subState);
    if (isNullish(union)) {
        return defaultResult;
    }
    const captureSubStateType = union.type;
    switch (captureSubStateType) {
        case 'StartCapture':
        case 'CreateEcdsaKey':
        case 'RegisterAuthnMethodSession':
        case 'NeedConfirmAuthnMethodSessionRegistration':
        case 'ExitAndRegisterHolderAuthnMethod':
        case 'CaptureFailed': {
            return defaultResult;
        }
        case 'GetHolderContractPrincipal': {
            return {type: 'verifyingPrincipal'};
        }
        case 'NeedDeleteProtectedIdentityAuthnMethod': {
            return {type: 'protectedDeviceDetected'};
        }
        case 'ObtainingIdentityAuthnMethods':
        case 'DeletingIdentityAuthnMethods':
        case 'FinishCapture': {
            const result: CaptureStepRemovingDevices = {
                type: 'removingDevices',
                passkeysLeft: 0
            };
            if (captureSubStateType === 'DeletingIdentityAuthnMethods') {
                const numberOfAuthnPubkeys = union.state.authn_pubkeys.length;
                const numberOfOpenIdCredentials = fromNullishNullable(union.state.openid_credentials)?.length ?? 0;
                result.passkeysLeft = numberOfAuthnPubkeys + numberOfOpenIdCredentials;
            }
            return result;
        }
        default: {
            const exhaustiveCheck: never = captureSubStateType;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return defaultResult;
        }
    }
};
