import {nonNullish} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useActivateContract} from 'frontend/src/context/contract/useActivateContract';
import {useCanActivateContract} from 'frontend/src/context/identityHolder/state/waitingActivation/useCanActivateContract';
import {i18} from 'frontend/src/i18';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {createContext, useCallback, useContext, useMemo, type PropsWithChildren, type ReactNode} from 'react';
import {useContractNotActivatedAuthorizedFormDataContext} from './ContractNotActivatedAuthorizedFormDataProvider';

type Context = {
    buttonProps: ButtonProps;
    actionInProgress: boolean;
    actionErrorPanel: ReactNode;

    formControlsDisabled: boolean;
};

const Context = createContext<Context | undefined>(undefined);
export const useContractNotActivatedAuthorizedDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useContractNotActivatedAuthorizedDataContext must be used within a ContractNotActivatedAuthorizedDataProvider');
    }
    return context;
};

export const ContractNotActivatedAuthorizedDataProvider = (props: PropsWithChildren) => {
    const {formDataAvailability} = useContractNotActivatedAuthorizedFormDataContext();
    const {activateContract, feature, responseError} = useActivateContract();
    const actionInProgress = feature.status.inProgress;
    const canActivateContract = useCanActivateContract();

    const performAction = useCallback(async () => {
        if (formDataAvailability.type != 'available') {
            return;
        }
        await activateContract(formDataAvailability.activationCode);
    }, [activateContract, formDataAvailability]);

    const buttonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.children = i18.contract.activation.notActivated.form.button;
        result.disabled = actionInProgress || formDataAvailability.type != 'available' || !canActivateContract;
        result.loading = actionInProgress;
        result.onClick = performAction;
        return result;
    }, [canActivateContract, formDataAvailability, actionInProgress, performAction]);

    const actionErrorPanel: ReactNode = useMemo(() => {
        let messageText = i18.common.error.unableTo;
        if (feature.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? feature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (nonNullish(responseError)) {
            if (hasProperty(responseError, 'ValidationFailed')) {
                messageText = i18.contract.activation.notActivated.stub.validationError;
            }
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(responseError) : undefined} />;
            return <ErrorAlert message={message} />;
        }
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
