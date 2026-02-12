import {nonNullish} from '@dfinity/utils';
import {type ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useBuyerCanCancelOffer} from 'frontend/src/context/identityHolder/state/holding/useBuyerCanCancelOffer';
import {useCancelBuyerOffer} from 'frontend/src/context/identityHolder/state/holding/useCancelBuyerOffer';
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
export const useCancelBuyerOfferModalDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useCancelBuyerOfferModalDataContext must be used within a CancelBuyerOfferModalDataProvider');
    }
    return context;
};
type Props = {
    onCancelModal: () => void;
};
export const CancelBuyerOfferModalDataProvider = (props: PropsWithChildren<Props>) => {
    const {onCancelModal} = props;
    const buyerCanCancelOffer = useBuyerCanCancelOffer();
    const {cancelBuyerOffer, feature, responseError} = useCancelBuyerOffer();
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
        if (!buyerCanCancelOffer) {
            return {type: 'notAvailable'};
        }
        return {type: 'available'};
    }, [buyerCanCancelOffer, identityHolderLoaded]);

    /**
    ==========================================
    Action
    ==========================================
    */

    const performAction = useCallback(async () => {
        if (actionAvailability.type != 'available') {
            return;
        }
        return await cancelBuyerOffer();
    }, [actionAvailability.type, cancelBuyerOffer]);

    /**
    ==========================================
    Button props
    ==========================================
    */

    const okButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.children = i18.holder.state.holding.modal.cancelBuyerOffer.okButton;
        result.danger = true;
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
