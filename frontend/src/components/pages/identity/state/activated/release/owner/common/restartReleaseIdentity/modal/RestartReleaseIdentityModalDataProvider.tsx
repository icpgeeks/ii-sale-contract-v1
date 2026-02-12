import {nonNullish, toNullable} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useRefetchIdentityHolder} from 'frontend/src/context/identityHolder/useRefetchIdentityHolder';
import {i18} from 'frontend/src/i18';
import type {DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {createContext, useCallback, useContext, useMemo, type PropsWithChildren, type ReactNode} from 'react';
import {useRestartReleaseIdentityDataContext} from '../RestartReleaseIdentityDataProvider';

type ActionAvailability = DataAvailability;

type Context = {
    okButtonProps: ButtonProps;
    cancelButtonProps: ButtonProps;

    actionErrorPanel: ReactNode;

    actionAvailability: ActionAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useRestartReleaseIdentityModalDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useRestartReleaseIdentityModalDataContext must be used within a RestartReleaseIdentityModalDataProvider');
    }
    return context;
};

type Props = {
    onCancelModal: () => void;
};
export const RestartReleaseIdentityModalDataProvider = (props: PropsWithChildren<Props>) => {
    const {onCancelModal} = props;
    const identityHolderLoaded = useRefetchIdentityHolder();
    const {
        restartReleaseIdentity: {restartReleaseIdentity, feature, responseError},
        ownerCanRestartReleaseIdentity: {ownerCanRestartReleaseIdentity}
    } = useRestartReleaseIdentityDataContext();
    const actionInProgress = feature.status.inProgress;

    /**
    ==========================================
    ActionAvailability
    ==========================================
    */

    const actionAvailability = useMemo<ActionAvailability>(() => {
        if (!identityHolderLoaded) {
            return {type: 'loading'};
        }
        if (!ownerCanRestartReleaseIdentity) {
            return {type: 'notAvailable'};
        }
        return {type: 'available'};
    }, [identityHolderLoaded, ownerCanRestartReleaseIdentity]);

    /**
    ==========================================
    Action
    ==========================================
    */

    const performAction = useCallback(async () => {
        if (actionAvailability.type != 'available') {
            return;
        }
        return await restartReleaseIdentity({registration_id: toNullable()});
    }, [actionAvailability.type, restartReleaseIdentity]);

    /**
    ==========================================
    Button props
    ==========================================
    */

    const okButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.children = i18.holder.state.release.common.modal.restartTransfer.button;
        result.disabled = actionInProgress || actionAvailability.type != 'available';
        result.loading = actionInProgress;
        result.onClick = async () => {
            const result = await performAction();
            if (result?.success) {
                onCancelModal();
            }
        };
        return result;
    }, [actionAvailability.type, actionInProgress, onCancelModal, performAction]);

    const cancelButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.children = i18.common.button.cancelButton;
        result.disabled = actionInProgress || actionAvailability.type == 'loading';
        result.onClick = onCancelModal;
        return result;
    }, [actionAvailability.type, actionInProgress, onCancelModal]);

    /**
    ==========================================
    Action Error panel
    ==========================================
    */

    const actionErrorPanel: ReactNode = useMemo(() => {
        const messageText = i18.common.error.unableTo;
        if (feature.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? feature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (nonNullish(responseError)) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(responseError) : undefined} />;
            return <ErrorAlert message={message} />;
        }
    }, [feature.error, responseError]);

    const value = useMemo<Context>(() => {
        return {
            okButtonProps,
            cancelButtonProps,

            actionErrorPanel,

            actionAvailability
        };
    }, [actionAvailability, actionErrorPanel, cancelButtonProps, okButtonProps]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
