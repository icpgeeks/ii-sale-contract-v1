import {nonNullish} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {storeCaptureActivationCode} from 'frontend/src/components/pages/common/TemporaryUIData';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {useConfirmHolderAuthnMethodRegistration} from 'frontend/src/context/identityHolder/state/capture/useConfirmHolderAuthnMethodRegistration';
import {useOwnerCanConfirmHolderAuthnMethodRegistration} from 'frontend/src/context/identityHolder/state/capture/useOwnerCanConfirmHolderAuthnMethodRegistration';
import {i18} from 'frontend/src/i18';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {createContext, useContext, useMemo, type PropsWithChildren, type ReactNode} from 'react';
import {HolderProcessingErrorPanel} from '../../../../common/processingError/HolderProcessingErrorPanel';
import {useNeedConfirmAuthnMethodSessionRegistrationFormDataContext} from './NeedConfirmAuthnMethodSessionRegistrationFormDataProvider';
import {useNeedConfirmAuthnMethodSessionRegistrationRemainingTimerActive} from './useNeedConfirmAuthnMethodSessionRegistrationRemainingTimerActive';

type Context = {
    timerActive: boolean;
    confirmationCode: string;
    expirationTimeMillis: bigint | undefined;
    buttonProps: ButtonProps;
    actionInProgress: boolean;
    actionErrorPanel: ReactNode;
    formControlsDisabled: boolean;
};

const Context = createContext<Context | undefined>(undefined);
export const useNeedConfirmAuthnMethodSessionRegistrationDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useNeedConfirmAuthnMethodSessionRegistrationDataContext must be used within a NeedConfirmAuthnMethodSessionRegistrationDataProvider');
    }
    return context;
};

export const NeedConfirmAuthnMethodSessionRegistrationDataProvider = (props: PropsWithChildren) => {
    const {formDataAvailability} = useNeedConfirmAuthnMethodSessionRegistrationFormDataContext();

    const timerActive = useNeedConfirmAuthnMethodSessionRegistrationRemainingTimerActive();

    const {getSubStateValue} = useIdentityHolderStateContext();
    const captureSubState = useMemo(() => getSubStateValue('Capture', 'NeedConfirmAuthnMethodSessionRegistration'), [getSubStateValue]);

    const confirmationCode = captureSubState?.confirmation_code ?? '';
    const expirationTimeMillis = captureSubState?.expiration;

    const {confirmHolderAuthnMethodRegistration, feature, responseError} = useConfirmHolderAuthnMethodRegistration();
    const actionInProgress = feature.status.inProgress;
    const ownerCanConfirmHolderAuthnMethodRegistration = useOwnerCanConfirmHolderAuthnMethodRegistration();
    const buttonProps: ButtonProps = useMemo(() => {
        const actionDisabled = !ownerCanConfirmHolderAuthnMethodRegistration || formDataAvailability.type != 'available' || actionInProgress;
        return {
            children: i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.button,
            loading: actionInProgress,
            disabled: actionDisabled,
            onClick: async () => {
                storeCaptureActivationCode(confirmationCode);
                await confirmHolderAuthnMethodRegistration();
            }
        };
    }, [ownerCanConfirmHolderAuthnMethodRegistration, actionInProgress, formDataAvailability.type, confirmHolderAuthnMethodRegistration, confirmationCode]);

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
            timerActive,
            confirmationCode,
            expirationTimeMillis,
            buttonProps,
            actionInProgress,
            actionErrorPanel,
            formControlsDisabled
        };
    }, [timerActive, confirmationCode, expirationTimeMillis, buttonProps, actionInProgress, actionErrorPanel, formControlsDisabled]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
