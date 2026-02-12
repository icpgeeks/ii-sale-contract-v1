import {nonNullish} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {i18} from 'frontend/src/i18';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {createContext, useContext, useMemo, type PropsWithChildren, type ReactNode} from 'react';
import {HolderProcessingErrorPanel} from '../../../../common/processingError/HolderProcessingErrorPanel';
import {useDeleteHolderAuthnMethodDataContext} from '../../common/deleteHolderAuthnMethod/DeleteHolderAuthnMethodDataProvider';

type Context = {
    actionInProgress: boolean;
    buttonProps: ButtonProps;
    actionErrorPanel: ReactNode;
};

const Context = createContext<Context | undefined>(undefined);
export const useIdentityAPIChangedDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityAPIChangedDataContext must be used within a IdentityAPIChangedDataProvider');
    }
    return context;
};

export const IdentityAPIChangedDataProvider = (props: PropsWithChildren) => {
    const {
        ownerCanDeleteHolderAuthnMethod,
        deleteHolderAuthnMethod: {deleteHolderAuthnMethod, feature, responseError}
    } = useDeleteHolderAuthnMethodDataContext();
    const actionInProgress = feature.status.inProgress;

    const buttonProps: ButtonProps = useMemo(() => {
        const actionDisabled = !ownerCanDeleteHolderAuthnMethod || actionInProgress;
        return {
            loading: actionInProgress,
            disabled: actionDisabled,
            onClick: () => deleteHolderAuthnMethod()
        };
    }, [ownerCanDeleteHolderAuthnMethod, actionInProgress, deleteHolderAuthnMethod]);

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

    const value = useMemo<Context>(() => {
        return {
            actionInProgress,
            buttonProps,
            actionErrorPanel
        };
    }, [actionInProgress, buttonProps, actionErrorPanel]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
