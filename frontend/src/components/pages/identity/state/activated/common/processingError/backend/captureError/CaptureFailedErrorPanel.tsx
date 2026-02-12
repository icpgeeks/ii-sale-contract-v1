import {isNullish} from '@dfinity/utils';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {useMemo} from 'react';
import type {CaptureError} from 'src/declarations/contract/contract.did';
import {HolderProcessingErrorPanel} from '../../HolderProcessingErrorPanel';

export const CaptureFailedErrorPanel = () => {
    const {getSubStateValue} = useIdentityHolderStateContext();
    const waitingStartCaptureError = getSubStateValue('Capture', 'CaptureFailed')?.error;

    const errorMessage = useMemo(() => {
        if (isNullish(waitingStartCaptureError)) {
            return undefined;
        }
        return getHolderAuthnMethodRegisterErrorMessage(waitingStartCaptureError);
    }, [waitingStartCaptureError]);

    if (isNullish(errorMessage)) {
        return <HolderProcessingErrorPanel />;
    }

    const message = <ErrorMessageText message={errorMessage} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(waitingStartCaptureError) : undefined} />;
    return <ErrorAlert message={message} />;
};

const getHolderAuthnMethodRegisterErrorMessage = (error: CaptureError): string => {
    const stateUnion = getSingleEntryUnion(error);
    if (isNullish(stateUnion)) {
        return i18.common.error.unableTo;
    }
    switch (stateUnion.type) {
        case 'SessionRegistrationAlreadyInProgress': {
            return i18.holder.state.capture.captureError.stub.sessionRegistrationAlreadyInProgress;
        }
        case 'SessionRegistrationModeExpired': {
            return i18.holder.state.capture.captureError.stub.sessionRegistrationModeExpired;
        }
        case 'SessionRegistrationModeOff': {
            return i18.holder.state.capture.captureError.stub.sessionRegistrationModeOff;
        }
        case 'InvalidMetadata': {
            return i18.holder.state.capture.captureError.stub.invalidMetadata;
        }
        case 'HolderAuthnMethodRegistrationModeOff': {
            return i18.holder.state.capture.captureError.stub.holderAuthnMethodRegistrationModeOff;
        }
        case 'HolderAuthnMethodRegistrationUnauthorized': {
            return i18.holder.state.capture.captureError.stub.holderAuthnMethodRegistrationUnauthorized;
        }
        case 'HolderDeviceLost': {
            return i18.holder.state.capture.captureError.stub.holderDeviceLost;
        }
        default: {
            const exhaustiveCheck: never = stateUnion;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return i18.common.error.unableTo;
        }
    }
};
