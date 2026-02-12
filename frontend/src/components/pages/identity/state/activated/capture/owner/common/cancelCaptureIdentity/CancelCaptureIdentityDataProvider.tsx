import type {ButtonProps} from 'antd';
import {useCancelCapture} from 'frontend/src/context/identityHolder/state/capture/useCancelCapture';
import {useOwnerCanCancelCapture} from 'frontend/src/context/identityHolder/state/capture/useOwnerCanCancelCapture';
import {i18} from 'frontend/src/i18';
import {createContext, useContext, useMemo, type PropsWithChildren} from 'react';
import {sendOpenCancelCaptureIdentityModalNotification} from './modal/CancelCaptureIdentityModalRenderer';

type Context = {
    buttonProps: ButtonProps;
    inlineButtonProps: ButtonProps;
    buttonVisible: boolean;

    cancelCapture: ReturnType<typeof useCancelCapture>;
    ownerCanCancelCapture: ReturnType<typeof useOwnerCanCancelCapture>;
};

const Context = createContext<Context | undefined>(undefined);
export const useCancelCaptureIdentityDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useCancelCaptureIdentityDataContext must be used within a CancelCaptureIdentityDataProvider');
    }
    return context;
};

type Props = {
    forceActionDisabled?: boolean;
};
export const CancelCaptureIdentityDataProvider = (props: PropsWithChildren<Props>) => {
    const {forceActionDisabled} = props;
    const cancelCapture = useCancelCapture();
    const {cancelCapture: cancelCaptureAction} = cancelCapture;
    const ownerCanCancelCapture = useOwnerCanCancelCapture();

    const buttonProps: ButtonProps = useMemo(() => {
        const actionInProgress = cancelCapture.feature.status.inProgress;
        const actionDisabled = !ownerCanCancelCapture.ownerCanCancelCapture || actionInProgress || forceActionDisabled;
        return {
            children: i18.holder.state.capture.common.actionButton.restartTransfer,
            danger: true,
            disabled: actionDisabled,
            loading: actionInProgress,
            onClick: sendOpenCancelCaptureIdentityModalNotification
        };
    }, [ownerCanCancelCapture.ownerCanCancelCapture, cancelCapture.feature.status.inProgress, forceActionDisabled]);

    const inlineButtonProps: ButtonProps = useMemo(() => {
        const actionInProgress = cancelCapture.feature.status.inProgress;
        const actionDisabled = !ownerCanCancelCapture.ownerCanCancelCapture || actionInProgress || forceActionDisabled;
        return {
            children: i18.holder.state.capture.common.actionButton.restartTransfer,
            disabled: actionDisabled,
            loading: actionInProgress,
            onClick: async () => {
                await cancelCaptureAction();
            }
        };
    }, [ownerCanCancelCapture.ownerCanCancelCapture, cancelCapture.feature.status.inProgress, forceActionDisabled, cancelCaptureAction]);

    const buttonVisible = ownerCanCancelCapture.ownerCanSeeCancelCaptureAction;

    const value = useMemo<Context>(() => {
        return {
            buttonProps,
            inlineButtonProps,
            buttonVisible,
            cancelCapture,
            ownerCanCancelCapture
        };
    }, [buttonProps, inlineButtonProps, buttonVisible, cancelCapture, ownerCanCancelCapture]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
