import {toNullable} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {useOwnerCanRestartReleaseIdentity} from 'frontend/src/context/identityHolder/state/release/useOwnerCanRestartReleaseIdentity';
import {useRestartReleaseIdentity} from 'frontend/src/context/identityHolder/state/release/useRestartReleaseIdentity';
import {i18} from 'frontend/src/i18';
import {createContext, useContext, useMemo, type PropsWithChildren} from 'react';
import {sendOpenRestartReleaseIdentityModalNotification} from './modal/RestartReleaseIdentityModalRenderer';

type Context = {
    buttonProps: ButtonProps;
    inlineButtonProps: ButtonProps;
    buttonVisible: boolean;

    restartReleaseIdentity: ReturnType<typeof useRestartReleaseIdentity>;
    ownerCanRestartReleaseIdentity: ReturnType<typeof useOwnerCanRestartReleaseIdentity>;
};

const Context = createContext<Context | undefined>(undefined);
export const useRestartReleaseIdentityDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useRestartReleaseIdentityDataContext must be used within a RestartReleaseIdentityDataProvider');
    }
    return context;
};

type Props = {
    forceActionDisabled?: boolean;
};
export const RestartReleaseIdentityDataProvider = (props: PropsWithChildren<Props>) => {
    const {forceActionDisabled} = props;
    const restartReleaseIdentity = useRestartReleaseIdentity();
    const {restartReleaseIdentity: restartReleaseIdentityAction} = restartReleaseIdentity;
    const ownerCanRestartReleaseIdentity = useOwnerCanRestartReleaseIdentity();

    const buttonProps: ButtonProps = useMemo(() => {
        const actionInProgress = restartReleaseIdentity.feature.status.inProgress;
        const actionDisabled = !ownerCanRestartReleaseIdentity.ownerCanRestartReleaseIdentity || actionInProgress || forceActionDisabled;
        const result: ButtonProps = {
            children: i18.holder.state.release.common.actionButton.restartTransfer,
            danger: true,
            disabled: actionDisabled,
            onClick: sendOpenRestartReleaseIdentityModalNotification
        };
        return result;
    }, [ownerCanRestartReleaseIdentity.ownerCanRestartReleaseIdentity, restartReleaseIdentity.feature.status.inProgress, forceActionDisabled]);

    const inlineButtonProps: ButtonProps = useMemo(() => {
        const actionInProgress = restartReleaseIdentity.feature.status.inProgress;
        const actionDisabled = !ownerCanRestartReleaseIdentity.ownerCanRestartReleaseIdentity || actionInProgress || forceActionDisabled;
        const result: ButtonProps = {
            children: i18.holder.state.release.common.actionButton.restartTransfer,
            disabled: actionDisabled,
            loading: actionInProgress,
            onClick: async () => {
                await restartReleaseIdentityAction({registration_id: toNullable()});
            }
        };
        return result;
    }, [forceActionDisabled, ownerCanRestartReleaseIdentity.ownerCanRestartReleaseIdentity, restartReleaseIdentity.feature.status.inProgress, restartReleaseIdentityAction]);

    const buttonVisible = ownerCanRestartReleaseIdentity.ownerCanSeeRestartReleaseIdentityAction;

    const value = useMemo<Context>(() => {
        return {
            buttonProps,
            inlineButtonProps,
            buttonVisible,
            restartReleaseIdentity,
            ownerCanRestartReleaseIdentity
        };
    }, [buttonProps, inlineButtonProps, buttonVisible, restartReleaseIdentity, ownerCanRestartReleaseIdentity]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
