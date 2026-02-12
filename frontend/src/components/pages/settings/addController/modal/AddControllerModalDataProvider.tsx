import {isNullish, nonNullish} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useAddContractController} from 'frontend/src/context/identityHolder/state/holding/useAddContractController';
import {useRefetchIdentityHolder} from 'frontend/src/context/identityHolder/useRefetchIdentityHolder';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {getDurationTillUTCMillisUnsafe} from 'frontend/src/utils/core/date/duration';
import {formatDuration} from 'frontend/src/utils/core/date/format';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren, type ReactNode} from 'react';
import {useAddControllerModalFormDataContext} from './AddControllerModalFormDataProvider';

type Step = 'loadingInitialData' | 'enteringPrincipal' | 'success';

type Context = {
    step: Step;

    actionErrorPanel?: ReactNode;

    cancelButtonProps?: ButtonProps;
    okButtonProps?: ButtonProps;
    okButtonVisible: boolean;

    formControlsDisabled: boolean;

    modalTitle: ReactNode;
};

const Context = createContext<Context | undefined>(undefined);
export const useAddControllerModalDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useAddControllerModalDataContext must be used within a AddControllerModalDataProvider');
    }
    return context;
};

type Props = {
    onCancelModal: () => void;
};
export const AddControllerModalDataProvider = (props: PropsWithChildren<Props>) => {
    const {onCancelModal} = props;
    const {formDataAvailability} = useAddControllerModalFormDataContext();
    const principalValid = formDataAvailability.type == 'available';
    const principal = formDataAvailability.type == 'available' ? formDataAvailability.principal : undefined;

    const {addContractController, feature, responseError} = useAddContractController();
    const [actionResultSuccess, setActionResultSuccess] = useState<boolean | undefined>();

    const actionInProgress = feature.status.inProgress;

    const identityHolderLoaded = useRefetchIdentityHolder();

    /**
    ==========================================
    Step
    ==========================================
    */

    const [step, setStep] = useState<Step>('loadingInitialData');

    useEffect(() => {
        if (identityHolderLoaded) {
            setStep('enteringPrincipal');
        }
    }, [identityHolderLoaded]);

    useEffect(() => {
        if (nonNullish(actionResultSuccess)) {
            setStep('success');
        }
    }, [actionResultSuccess]);

    /**
    ==========================================
    Action
    ==========================================
    */

    const performAction = useCallback(async () => {
        if (isNullish(principal)) {
            return;
        }
        return await addContractController({controller: principal});
    }, [principal, addContractController]);

    /**
    ==========================================
    Action Error panel
    ==========================================
    */

    const actionErrorPanel: ReactNode = useMemo(() => {
        let messageText = i18.common.error.unableTo;
        if (feature?.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? feature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} style={{marginBottom: 16}} />;
        } else if (nonNullish(responseError)) {
            if (hasProperty(responseError, 'CertificateNotExpired')) {
                messageText = i18.settings.danger.addController.modal.stub.notExpired;
            } else if (hasProperty(responseError, 'CriticalCyclesLevel')) {
                messageText = i18.settings.danger.addController.modal.stub.notEnoughCycles;
            } else if (hasProperty(responseError, 'AddControllerDelay')) {
                const durationMillis = getDurationTillUTCMillisUnsafe(responseError.AddControllerDelay.delay.time);
                const durationLabel = formatDuration(durationMillis);
                if (nonNullish(durationLabel)) {
                    messageText = i18.settings.danger.addController.modal.stub.delay(durationLabel);
                }
            }
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(responseError) : undefined} />;
            return <ErrorAlert message={message} style={{marginBottom: 16}} />;
        }
    }, [feature, responseError]);

    /**
    ==========================================
    Button props
    ==========================================
    */

    const okButtonProps: ButtonProps | undefined = useMemo(() => {
        switch (step) {
            case 'enteringPrincipal': {
                const result: ButtonProps = {};
                result.className = 'gf-flex-auto';
                result.children = i18.settings.danger.addController.modal.button;
                result.disabled = actionInProgress || !principalValid;
                result.loading = actionInProgress;
                result.onClick = async () => {
                    const result = await performAction();
                    if (result?.success) {
                        setActionResultSuccess(true);
                    }
                };
                return result;
            }
            case 'loadingInitialData':
            case 'success': {
                break;
            }
            default: {
                const exhaustiveCheck: never = step;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
    }, [step, principalValid, actionInProgress, performAction]);

    const cancelButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.onClick = () => {
            onCancelModal();
        };
        result.children = i18.common.button.cancelButton;
        switch (step) {
            case 'loadingInitialData':
            case 'enteringPrincipal': {
                result.disabled = actionInProgress;
                break;
            }
            case 'success': {
                result.children = i18.common.button.closeButton;
                break;
            }
            default: {
                const exhaustiveCheck: never = step;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
        return result;
    }, [step, onCancelModal, actionInProgress]);

    const okButtonVisible: boolean = useMemo(() => {
        return step == 'enteringPrincipal';
    }, [step]);

    /**
    ==========================================
    Modal title
    ==========================================
    */

    const modalTitle = useMemo(() => {
        return i18.settings.danger.addController.modal.title;
    }, []);

    const formControlsDisabled = actionInProgress;

    const value = useMemo<Context>(() => {
        return {
            step,
            actionErrorPanel,
            cancelButtonProps,
            okButtonProps,
            okButtonVisible,
            formControlsDisabled,
            modalTitle
        };
    }, [actionErrorPanel, cancelButtonProps, formControlsDisabled, modalTitle, okButtonProps, okButtonVisible, step]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
