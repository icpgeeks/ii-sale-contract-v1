import type {ApproveParams, IcrcAccount} from '@dfinity/ledger-icrc';
import {isNullish, nonNullish, toNullable} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {clearStoredReferralCode, getStoredReferralCode} from 'frontend/src/components/pages/common/ReferralTracker';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useSendIcrcApproveTransaction} from 'frontend/src/context/connectedWallet/useSendIcrcApproveTransaction';
import {useAcceptSellerOffer} from 'frontend/src/context/identityHolder/state/holding/useAcceptSellerOffer';
import {i18} from 'frontend/src/i18';
import {millisToNanos} from 'frontend/src/utils/core/date/constants';
import {useFError, type DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {icrcAccountToAccount} from 'frontend/src/utils/ic/account';
import {accountVariantToLedgerAccount} from 'frontend/src/utils/ic/ledgerAccount';
import {createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren, type ReactNode} from 'react';
import type {AcceptSellerOfferArgs} from 'src/declarations/contract/contract.did';
import {useRequiredData} from './useRequiredData';

type ActionAvailability = DataAvailability<{
    salePriceUlps: bigint;
    saleWillExpireAtMillis: bigint;
    icrcSpender: IcrcAccount;
}>;

type Context = {
    okButtonProps: ButtonProps;
    cancelButtonProps: ButtonProps;

    actionErrorPanel: ReactNode;

    requireData: ReturnType<typeof useRequiredData>;
};

const Context = createContext<Context | undefined>(undefined);
export const useBuyNowModalDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useBuyNowModalDataContext must be used within a BuyNowModalDataProvider');
    }
    return context;
};

type Props = {
    onCancelModal: () => void;
};
export const BuyNowModalDataProvider = (props: PropsWithChildren<Props>) => {
    const {onCancelModal} = props;

    const requireData = useRequiredData();
    const {requireDataAvailability} = requireData;

    const {acceptSellerOffer, feature, responseError} = useAcceptSellerOffer();
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
        if (requireDataAvailability.icrcSpender.owner.isAnonymous()) {
            // illegal state - we should not reach here
            return {type: 'notAvailable'};
        }

        return {
            type: 'available',
            salePriceUlps: requireDataAvailability.salePriceUlps,
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

        setActionInProgress(true);

        /**
        ==========================================
        Approve
        ==========================================
        */

        const expiresAt = millisToNanos(actionAvailability.saleWillExpireAtMillis);
        const approveParams: ApproveParams = {
            spender: icrcAccountToAccount(actionAvailability.icrcSpender),
            amount: actionAvailability.salePriceUlps,
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

        const parameters: AcceptSellerOfferArgs = {
            price: actionAvailability.salePriceUlps,
            approved_account: accountVariantToLedgerAccount({icrcAccount: connectedWalletIcrcAccount}),
            referral: toNullable(getStoredReferralCode())
        };
        const setBuyerOfferResult = await acceptSellerOffer(parameters);
        if (setBuyerOfferResult?.success) {
            clearStoredReferralCode();
        }
        setActionInProgress(false);
        return setBuyerOfferResult;
    }, [actionAvailability, sendIcrcApproveTransaction, acceptSellerOffer, updateSendIcrcApproveTransactionError]);

    /**
    ==========================================
    Button props
    ==========================================
    */

    const okButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.children = i18.holder.state.holding.modal.buyNow.buyButton;
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
            } else if (hasProperty(responseError, 'PriceMismatch')) {
                messageText = i18.holder.state.holding.modal.buyNow.stub.error.priceMismatch;
            }
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(responseError) : undefined} />;
            return <ErrorAlert message={message} />;
        }
    }, [feature.error, responseError, sendIcrcApproveTransactionError]);

    const value = useMemo<Context>(() => {
        return {
            okButtonProps,
            cancelButtonProps,

            actionErrorPanel,

            requireData,

            actionAvailability
        };
    }, [okButtonProps, cancelButtonProps, actionErrorPanel, requireData, actionAvailability]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
