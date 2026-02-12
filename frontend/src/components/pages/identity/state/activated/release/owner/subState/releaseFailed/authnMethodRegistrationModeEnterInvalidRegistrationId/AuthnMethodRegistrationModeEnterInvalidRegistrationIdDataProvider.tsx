import {nonNullish, toNullable} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {i18} from 'frontend/src/i18';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {createContext, useCallback, useContext, useMemo, type PropsWithChildren, type ReactNode} from 'react';
import {HolderProcessingErrorPanel} from '../../../../../common/processingError/HolderProcessingErrorPanel';
import {useRestartReleaseIdentityDataContext} from '../../../common/restartReleaseIdentity/RestartReleaseIdentityDataProvider';
import {useAuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataContext} from './AuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataProvider';

type Context = {
    buttonProps: ButtonProps;
    actionInProgress: boolean;
    actionErrorPanel: ReactNode;

    formControlsDisabled: boolean;
};

const Context = createContext<Context | undefined>(undefined);
export const useAuthnMethodRegistrationModeEnterInvalidRegistrationIdDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useAuthnMethodRegistrationModeEnterInvalidRegistrationIdDataContext must be used within a AuthnMethodRegistrationModeEnterInvalidRegistrationIdDataProvider');
    }
    return context;
};

export const AuthnMethodRegistrationModeEnterInvalidRegistrationIdDataProvider = (props: PropsWithChildren) => {
    const {formDataAvailability} = useAuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataContext();
    const {
        inlineButtonProps: originalButtonProps,
        restartReleaseIdentity: {restartReleaseIdentity, feature, responseError}
    } = useRestartReleaseIdentityDataContext();
    const actionInProgress = feature.status.inProgress;

    const performAction = useCallback(async () => {
        if (formDataAvailability.type != 'available') {
            return;
        }

        await restartReleaseIdentity({
            registration_id: toNullable(formDataAvailability.registrationId)
        });
    }, [formDataAvailability, restartReleaseIdentity]);

    const buttonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {...originalButtonProps};
        result.disabled = originalButtonProps.disabled || formDataAvailability.type != 'available';
        result.onClick = performAction;
        return result;
    }, [originalButtonProps, formDataAvailability.type, performAction]);

    const actionErrorPanel: ReactNode = useMemo(() => {
        const messageText = i18.common.error.unableTo;
        if (feature.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? feature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (nonNullish(responseError)) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(responseError) : undefined} />;
            return <ErrorAlert message={message} />;
        }
        return <HolderProcessingErrorPanel />;
    }, [feature.error, responseError]);

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
