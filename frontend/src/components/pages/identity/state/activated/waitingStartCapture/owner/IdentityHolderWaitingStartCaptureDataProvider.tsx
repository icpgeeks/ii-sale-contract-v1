import {isNullish, nonNullish} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {storeCaptureRegistrationId} from 'frontend/src/components/pages/common/TemporaryUIData';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useLookupRegistrationModeId} from 'frontend/src/context/ic/internet_identity/useLookupRegistrationModeId';
import {useOwnerCanStartCapture} from 'frontend/src/context/identityHolder/state/waitingStartCapture/useOwnerCanStartCapture';
import {useStartCapture} from 'frontend/src/context/identityHolder/state/waitingStartCapture/useStartCapture';
import {i18} from 'frontend/src/i18';
import {useFeature} from 'frontend/src/utils/core/feature/feature';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {createContext, useCallback, useContext, useMemo, type PropsWithChildren, type ReactNode} from 'react';
import {CaptureFailedErrorPanel} from '../../common/processingError/backend/captureError/CaptureFailedErrorPanel';
import {useIdentityHolderWaitingStartCaptureFormDataContext} from './IdentityHolderWaitingStartCaptureFormDataProvider';

type Context = {
    buttonProps: ButtonProps;
    actionInProgress: boolean;
    actionErrorPanel: ReactNode;

    formControlsDisabled: boolean;
};

const Context = createContext<Context | undefined>(undefined);
export const useIdentityHolderWaitingStartCaptureDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityHolderWaitingStartCaptureDataContext must be used within a IdentityHolderWaitingStartCaptureDataProvider');
    }
    return context;
};

export const IdentityHolderWaitingStartCaptureDataProvider = (props: PropsWithChildren) => {
    const {formDataAvailability} = useIdentityHolderWaitingStartCaptureFormDataContext();
    const {startCapture, feature: startCaptureFeature, responseError: startCaptureResponseError} = useStartCapture();
    const {lookupByRegistrationModeId, feature: lookupByRegistrationModeIdFeature, responseError: lookupByRegistrationModeIdResponseError} = useLookupRegistrationModeId();

    const [actionFeature, updateActionFeature] = useFeature();
    const actionInProgress = actionFeature.status.inProgress;

    const ownerCanStartCapture = useOwnerCanStartCapture();

    const performAction = useCallback(async () => {
        if (formDataAvailability.type != 'available') {
            return;
        }
        updateActionFeature({status: {inProgress: true}});

        const identityNumber: bigint | undefined = await lookupByRegistrationModeId(formDataAvailability.registrationId);
        if (isNullish(identityNumber)) {
            updateActionFeature({
                status: {inProgress: false, loaded: true}
            });
            return;
        }

        storeCaptureRegistrationId(formDataAvailability.registrationId);

        await startCapture({
            identity_number: identityNumber
        });

        updateActionFeature({
            status: {inProgress: false, loaded: true}
        });
    }, [formDataAvailability, lookupByRegistrationModeId, startCapture, updateActionFeature]);

    const buttonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.children = i18.holder.state.capture.waitingStartCapture.button;
        result.disabled = actionInProgress || formDataAvailability.type != 'available' || !ownerCanStartCapture;
        result.loading = actionInProgress;
        result.onClick = performAction;
        return result;
    }, [ownerCanStartCapture, formDataAvailability.type, actionInProgress, performAction]);

    const actionErrorPanel: ReactNode = useMemo(() => {
        let messageText = i18.common.error.unableTo;
        if (lookupByRegistrationModeIdFeature.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? lookupByRegistrationModeIdFeature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (nonNullish(lookupByRegistrationModeIdResponseError)) {
            messageText = i18.holder.state.capture.waitingStartCapture.stub.error.invalidRegistrationId;
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(lookupByRegistrationModeIdResponseError) : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (startCaptureFeature.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? startCaptureFeature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (nonNullish(startCaptureResponseError)) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(startCaptureResponseError) : undefined} />;
            return <ErrorAlert message={message} />;
        }
        return <CaptureFailedErrorPanel />;
    }, [lookupByRegistrationModeIdFeature.error, lookupByRegistrationModeIdResponseError, startCaptureFeature.error, startCaptureResponseError]);

    const formControlsDisabled = actionInProgress;

    const value = useMemo<Context>(() => {
        return {
            buttonProps,
            actionInProgress,
            actionErrorPanel,
            formControlsDisabled
        };
    }, [buttonProps, actionInProgress, actionErrorPanel, formControlsDisabled]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
