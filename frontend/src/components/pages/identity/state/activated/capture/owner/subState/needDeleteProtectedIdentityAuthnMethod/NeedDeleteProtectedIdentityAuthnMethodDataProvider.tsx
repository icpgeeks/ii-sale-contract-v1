import {nonNullish} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {AlertActionButton} from 'frontend/src/components/widgets/alert/AlertActionButton';
import {ErrorAlertWithAction} from 'frontend/src/components/widgets/alert/ErrorAlertWithAction';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useOwnerCanCallProtectedAuthnMethodDeleted} from 'frontend/src/context/identityHolder/state/capture/useOwnerCanCallProtectedAuthnMethodDeleted';
import {useProtectedAuthnMethodDeleted} from 'frontend/src/context/identityHolder/state/capture/useProtectedAuthnMethodDeleted';
import {i18} from 'frontend/src/i18';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {createContext, useContext, useMemo, type PropsWithChildren, type ReactNode} from 'react';

type Context = {
    buttonProps: ButtonProps;
    actionInProgress: boolean;
    actionErrorPanel: ReactNode;
};

const Context = createContext<Context | undefined>(undefined);
export const useNeedDeleteProtectedIdentityAuthnMethodDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useNeedDeleteProtectedIdentityAuthnMethodDataContext must be used within a NeedDeleteProtectedIdentityAuthnMethodDataProvider');
    }
    return context;
};

export const NeedDeleteProtectedIdentityAuthnMethodDataProvider = (props: PropsWithChildren) => {
    const {protectedAuthnMethodDeleted, feature, responseError} = useProtectedAuthnMethodDeleted();
    const actionInProgress = feature.status.inProgress;
    const ownerCanCallProtectedAuthnMethodDeleted = useOwnerCanCallProtectedAuthnMethodDeleted();
    const buttonProps: ButtonProps = useMemo(() => {
        const actionDisabled = !ownerCanCallProtectedAuthnMethodDeleted || actionInProgress;
        return {
            children: i18.common.button.retryButton,
            loading: actionInProgress,
            disabled: actionDisabled,
            onClick: () => protectedAuthnMethodDeleted()
        };
    }, [actionInProgress, protectedAuthnMethodDeleted, ownerCanCallProtectedAuthnMethodDeleted]);

    const actionErrorPanel: ReactNode = useMemo(() => {
        const messageText = i18.common.error.unableTo;
        const buttonAction = () => protectedAuthnMethodDeleted();
        if (feature.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? feature.error.error?.message : undefined} />;
            return <ErrorAlertWithAction message={message} action={<AlertActionButton onClick={buttonAction} loading={actionInProgress} label={i18.common.button.retryButton} />} />;
        } else if (nonNullish(responseError)) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(responseError) : undefined} />;
            return <ErrorAlertWithAction message={message} action={<AlertActionButton onClick={buttonAction} loading={actionInProgress} label={i18.common.button.retryButton} />} />;
        }
    }, [feature.error, protectedAuthnMethodDeleted, responseError, actionInProgress]);

    const value = useMemo<Context>(() => {
        return {
            buttonProps,
            actionInProgress,
            actionErrorPanel
        };
    }, [buttonProps, actionInProgress, actionErrorPanel]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
