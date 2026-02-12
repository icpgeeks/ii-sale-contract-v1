import {nonNullish} from '@dfinity/utils';
import {type ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useCancelSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useCancelSaleIntention';
import {useOwnerCanCancelSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanCancelSaleIntention';
import {useRefetchIdentityHolder} from 'frontend/src/context/identityHolder/useRefetchIdentityHolder';
import {i18} from 'frontend/src/i18';
import type {DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {createContext, useCallback, useContext, useMemo, type PropsWithChildren, type ReactNode} from 'react';

type ActionAvailability = DataAvailability;

type Context = {
    cancelButtonProps?: ButtonProps;
    okButtonProps?: ButtonProps;

    actionErrorPanel: ReactNode;

    actionAvailability: ActionAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useCancelSaleIntentionModalDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useCancelSaleIntentionModalDataContext must be used within a CancelSaleIntentionModalDataProvider');
    }
    return context;
};
type Props = {
    onCancelModal: () => void;
    onOkModal?: () => void;

    allowAlways?: boolean;
};
export const CancelSaleIntentionModalDataProvider = (props: PropsWithChildren<Props>) => {
    const {onCancelModal, onOkModal, allowAlways = false} = props;
    const ownerCanCancelSaleIntention = useOwnerCanCancelSaleIntention();
    const {cancelSaleIntention, feature, responseError} = useCancelSaleIntention(allowAlways);
    const actionInProgress = feature.status.inProgress;
    const identityHolderLoaded = useRefetchIdentityHolder();

    /**
    ==========================================
    ActionAvailability
    ==========================================
    */

    const actionAvailability = useMemo<ActionAvailability>(() => {
        if (!identityHolderLoaded) {
            return {type: 'loading'};
        }
        if (!allowAlways) {
            if (!ownerCanCancelSaleIntention) {
                return {type: 'notAvailable'};
            }
        }
        return {type: 'available'};
    }, [ownerCanCancelSaleIntention, identityHolderLoaded, allowAlways]);

    /**
    ==========================================
    Action
    ==========================================
    */

    const performAction = useCallback(async () => {
        if (actionAvailability.type != 'available') {
            return;
        }
        return await cancelSaleIntention();
    }, [actionAvailability.type, cancelSaleIntention]);

    /**
    ==========================================
    Button props
    ==========================================
    */

    const okButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.children = i18.holder.state.holding.modal.cancelSaleIntention.okButton;
        result.danger = true;
        result.disabled = actionInProgress || actionAvailability.type != 'available';
        result.loading = actionInProgress;
        result.onClick = async () => {
            const result = await performAction();
            if (result?.success) {
                onOkModal?.();
            }
        };
        return result;
    }, [actionAvailability.type, actionInProgress, onOkModal, performAction]);

    const cancelButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.children = i18.common.button.cancelButton;
        result.disabled = actionInProgress || actionAvailability.type == 'loading';
        result.onClick = () => {
            onCancelModal();
        };
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
            cancelButtonProps,
            okButtonProps,
            actionErrorPanel,
            actionAvailability
        };
    }, [actionAvailability, cancelButtonProps, actionErrorPanel, okButtonProps]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
