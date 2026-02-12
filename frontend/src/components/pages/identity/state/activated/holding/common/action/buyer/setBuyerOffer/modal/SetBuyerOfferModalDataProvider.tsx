import type {ApproveParams, IcrcAccount} from '@dfinity/ledger-icrc';
import {isNullish, nonNullish, toNullable} from '@dfinity/utils';
import {type ButtonProps} from 'antd';
import {clearStoredReferralCode, getStoredReferralCode} from 'frontend/src/components/pages/common/ReferralTracker';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useSendIcrcApproveTransaction} from 'frontend/src/context/connectedWallet/useSendIcrcApproveTransaction';
import {useBuyerCanCancelOffer} from 'frontend/src/context/identityHolder/state/holding/useBuyerCanCancelOffer';
import {useSetBuyerOffer} from 'frontend/src/context/identityHolder/state/holding/useSetBuyerOffer';
import {i18} from 'frontend/src/i18';
import {millisToNanos} from 'frontend/src/utils/core/date/constants';
import {useFError, type DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {icrcAccountToAccount} from 'frontend/src/utils/ic/account';
import {accountVariantToLedgerAccount} from 'frontend/src/utils/ic/ledgerAccount';
import {createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren, type ReactNode} from 'react';
import type {SetBuyerOfferArgs} from 'src/declarations/contract/contract.did';
import {sendOpenCancelBuyerOfferModalNotification} from '../../cancelBuyerOffer/modal/CancelBuyerOfferModalRenderer';
import {useSetBuyerOfferModalFormDataContext} from './SetBuyerOfferModalFormDataProvider';
import {useRequiredData} from './useRequiredData';

type ActionAvailability = DataAvailability<{
    offerAmountUlps: bigint;
    saleWillExpireAtMillis: bigint;
    icrcSpender: IcrcAccount;
}>;

type Context = {
    okButtonProps: ButtonProps;
    cancelButtonProps: ButtonProps;
    cancelBuyerOfferButtonVisible: boolean;
    cancelBuyerOfferButtonProps?: ButtonProps;

    actionErrorPanel: ReactNode;

    formControlsDisabled: boolean;
    modalTitle: ReactNode;
    modalSubTitle: ReactNode;

    requireData: ReturnType<typeof useRequiredData>;
};

const Context = createContext<Context | undefined>(undefined);
export const useSetBuyerOfferModalDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useSetBuyerOfferModalDataContext must be used within a SetBuyerOfferModalDataProvider');
    }
    return context;
};

type Props = {
    onCancelModal: () => void;
};
export const SetBuyerOfferModalDataProvider = (props: PropsWithChildren<Props>) => {
    const {onCancelModal} = props;

    const {formDataAvailability} = useSetBuyerOfferModalFormDataContext();

    const requireData = useRequiredData(formDataAvailability.type == 'available' ? formDataAvailability.offerAmountUlps : undefined);
    const {requireDataAvailability} = requireData;

    const buyerCanCancelOffer = useBuyerCanCancelOffer();
    const {setBuyerOffer, feature, responseError, reset: resetSetBuyerOfferState} = useSetBuyerOffer();
    const {sendIcrcApproveTransaction} = useSendIcrcApproveTransaction();
    const [sendIcrcApproveTransactionError, updateSendIcrcApproveTransactionError] = useFError();

    const [actionInProgress, setActionInProgress] = useState(false);

    /**
    ==========================================
    ActionAvailability
    ==========================================
    */

    const actionAvailability = useMemo<ActionAvailability>(() => {
        if (requireDataAvailability.type == 'loading') {
            return {type: 'loading'};
        }
        if (requireDataAvailability.type == 'notAvailable') {
            return {type: 'notAvailable'};
        }
        if (requireDataAvailability.buyerOfferCostContext.type != 'canSetOffer') {
            return {type: 'notAvailable'};
        }
        if (requireDataAvailability.icrcSpender.owner.isAnonymous()) {
            // illegal state - we should not reach here
            return {type: 'notAvailable'};
        }

        return {
            type: 'available',
            offerAmountUlps: requireDataAvailability.buyerOfferCostContext.offerAmountUlps,
            saleWillExpireAtMillis: requireDataAvailability.saleWillExpireAtMillis,
            icrcSpender: requireDataAvailability.icrcSpender
        };
    }, [requireDataAvailability]);

    /**
    ==========================================
    Action
    ==========================================
    */

    const performAction: () => Promise<{success: boolean} | undefined> = useCallback(async () => {
        if (actionAvailability.type != 'available') {
            return;
        }

        resetSetBuyerOfferState();
        setActionInProgress(true);

        /**
        ==========================================
        Approve
        ==========================================
        */

        const expiresAt = millisToNanos(actionAvailability.saleWillExpireAtMillis);
        const approveParams: ApproveParams = {
            spender: icrcAccountToAccount(actionAvailability.icrcSpender),
            amount: actionAvailability.offerAmountUlps,
            expires_at: expiresAt
        };
        const approveResult = await sendIcrcApproveTransaction(approveParams);
        if (isNullish(approveResult)) {
            updateSendIcrcApproveTransactionError({isError: true, error: undefined});
            setActionInProgress(false);
            return;
        } else {
            updateSendIcrcApproveTransactionError({isError: false, error: undefined});
        }
        const connectedWalletIcrcAccount = approveResult.icrcAccount;

        /**
        ==========================================
        Set Buyer Offer
        ==========================================
        */

        const parameters: SetBuyerOfferArgs = {
            offer_amount: actionAvailability.offerAmountUlps,
            approved_account: accountVariantToLedgerAccount({icrcAccount: connectedWalletIcrcAccount}),
            referral: toNullable(getStoredReferralCode())
        };
        const setBuyerOfferResult = await setBuyerOffer(parameters);
        if (setBuyerOfferResult?.success) {
            clearStoredReferralCode();
        }
        setActionInProgress(false);
        return setBuyerOfferResult;
    }, [actionAvailability, sendIcrcApproveTransaction, setBuyerOffer, updateSendIcrcApproveTransactionError, resetSetBuyerOfferState]);

    /**
    ==========================================
    Button props
    ==========================================
    */

    const okButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.children = buyerCanCancelOffer ? i18.holder.state.holding.modal.makeOffer.editButton : i18.holder.state.holding.modal.makeOffer.setButton;
        result.disabled = actionInProgress || actionAvailability.type != 'available';
        result.loading = actionInProgress;
        result.onClick = async () => {
            const result = await performAction();
            if (result?.success) {
                onCancelModal();
            }
        };
        return result;
    }, [actionAvailability.type, actionInProgress, onCancelModal, performAction, buyerCanCancelOffer]);

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

    const [cancelBuyerOfferButtonVisible, cancelBuyerOfferButtonProps]: [boolean, ButtonProps | undefined] = useMemo(() => {
        if (!buyerCanCancelOffer) {
            return [false, undefined];
        }

        return [
            true,
            {
                danger: true,
                children: i18.holder.state.holding.modal.makeOffer.removeOffer,
                disabled: actionInProgress,
                onClick: () => {
                    onCancelModal();
                    sendOpenCancelBuyerOfferModalNotification();
                }
            }
        ];
    }, [buyerCanCancelOffer, actionInProgress, onCancelModal]);

    /**
    ==========================================
    Modal title
    ==========================================
    */

    const [modalTitle, modalSubTitle] = useMemo(() => {
        return buyerCanCancelOffer
            ? [i18.holder.state.holding.modal.makeOffer.title.edit, i18.holder.state.holding.modal.makeOffer.description.edit]
            : [i18.holder.state.holding.modal.makeOffer.title.set, i18.holder.state.holding.modal.makeOffer.description.set];
    }, [buyerCanCancelOffer]);

    /**
    ==========================================
    Action Error panel
    ==========================================
    */

    const actionErrorPanel: ReactNode = useMemo(() => {
        let messageText = i18.common.error.unableTo;
        if (sendIcrcApproveTransactionError.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? sendIcrcApproveTransactionError.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (feature.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? feature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (nonNullish(responseError)) {
            if (hasProperty(responseError, 'CheckApprovedBalanceError') && hasProperty(responseError.CheckApprovedBalanceError.error, 'InsufficientBalance')) {
                messageText = i18.common.error.insufficientBalance;
            } else if (hasProperty(responseError, 'OfferAmountExceedsPrice')) {
                messageText = i18.holder.state.holding.modal.makeOffer.stub.error.offerAmountExceedsPrice;
            }
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(responseError) : undefined} />;
            return <ErrorAlert message={message} />;
        }
    }, [feature.error, responseError, sendIcrcApproveTransactionError]);

    const formControlsDisabled = useMemo(() => {
        return actionInProgress || requireDataAvailability.type == 'notAvailable';
    }, [actionInProgress, requireDataAvailability.type]);

    const value = useMemo<Context>(() => {
        return {
            okButtonProps,
            cancelButtonProps,
            cancelBuyerOfferButtonVisible,
            cancelBuyerOfferButtonProps,

            actionErrorPanel,

            formControlsDisabled,

            modalTitle,
            modalSubTitle,

            requireData
        };
    }, [okButtonProps, cancelButtonProps, cancelBuyerOfferButtonVisible, cancelBuyerOfferButtonProps, actionErrorPanel, formControlsDisabled, modalTitle, modalSubTitle, requireData]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
