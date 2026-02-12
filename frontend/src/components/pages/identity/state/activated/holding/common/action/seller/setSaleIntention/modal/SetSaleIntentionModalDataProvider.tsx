import type {GetAccountIdentifierTransactionsResponse} from '@dfinity/ledger-icp';
import type {GetTransactionsParams} from '@dfinity/ledger-icp/dist/types/index.params';
import type {AccountIdentifierParam} from '@dfinity/ledger-icp/dist/types/ledger.params';
import type {IcrcAccount} from '@dfinity/ledger-icrc';
import {isEmptyString, isNullish, nonNullish} from '@dfinity/utils';
import {type ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useChangeSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useChangeSaleIntention';
import {useOwnerCanChangeSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanChangeSaleIntention';
import {useOwnerCanSetSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanSetSaleIntention';
import {useSetSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useSetSaleIntention';
import {useRefetchIdentityHolder} from 'frontend/src/context/identityHolder/useRefetchIdentityHolder';
import {useICPTransactions} from 'frontend/src/context/ledger/icp/useICPTransactions';
import {apiLogger, applicationLogger} from 'frontend/src/context/logger/logger';
import {caughtErrorMessage, exhaustiveCheckFailedMessage, skipMessage} from 'frontend/src/context/logger/loggerConstants';
import {createWalletInstance} from 'frontend/src/context/wallet';
import {i18} from 'frontend/src/i18';
import {toError} from 'frontend/src/utils/core/error/toError';
import {useFeature, type Feature} from 'frontend/src/utils/core/feature/feature';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {reusePromiseWrapper} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {accountVariantToAccountIdentifierParamSafe, icrcAccountToHex} from 'frontend/src/utils/ic/account';
import {accountVariantToLedgerAccount} from 'frontend/src/utils/ic/ledgerAccount';
import {createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren, type ReactNode} from 'react';
import {useSetSaleIntentionModalFormDataContext} from './SetSaleIntentionModalFormDataProvider';

type Step = 'loadingInitialData' | 'choosingAccountSource' | 'enteringAccount' | 'loadingAccountTransactions' | 'accountConfirmation';

type Context = {
    step: Step;

    icpTransactionsResponse?: GetAccountIdentifierTransactionsResponse;
    icpTransactionsFeature: Feature;
    fetchTransactionsChunk: () => Promise<void>;

    actionErrorPanel?: ReactNode;

    backButtonProps?: ButtonProps;
    nextButtonProps?: ButtonProps;

    oisyButtonProps?: ButtonProps;
    manualButtonProps?: ButtonProps;

    formControlsDisabled: boolean;

    modalTitle: ReactNode;
};

const Context = createContext<Context | undefined>(undefined);
export const useSetSaleIntentionModalDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useSetSaleIntentionModalDataContext must be used within a SetSaleIntentionModalDataProvider');
    }
    return context;
};

type Props = {
    onCancelModal: () => void;
    onOkModal?: () => void;
};
export const SetSaleIntentionModalDataProvider = (props: PropsWithChildren<Props>) => {
    const {onCancelModal, onOkModal} = props;

    const {formDataAvailability, formValidationState, updateFormState} = useSetSaleIntentionModalFormDataContext();
    const accountVariant = formValidationState.accountVariant?.type == 'valid' ? formValidationState.accountVariant.accountVariant : undefined;
    const accountVariantValid = nonNullish(accountVariant);
    const formDataAvailable = formDataAvailability.type == 'available';

    const ownerCanSetSaleIntention = useOwnerCanSetSaleIntention();
    const ownerCanChangeSaleIntention = useOwnerCanChangeSaleIntention();
    const {setSaleIntention, feature: setSaleIntentionFeature, responseError: setSaleIntentionResponseError} = useSetSaleIntention();
    const {changeSaleIntention, feature: changeSaleIntentionFeature, responseError: changeSaleIntentionResponseError} = useChangeSaleIntention();
    const actionFeature = ownerCanSetSaleIntention ? setSaleIntentionFeature : ownerCanChangeSaleIntention ? changeSaleIntentionFeature : undefined;
    const responseError = ownerCanSetSaleIntention ? setSaleIntentionResponseError : ownerCanChangeSaleIntention ? changeSaleIntentionResponseError : undefined;

    const actionInProgress = ownerCanSetSaleIntention ? setSaleIntentionFeature.status.inProgress : changeSaleIntentionFeature.status.inProgress;

    const identityHolderLoaded = useRefetchIdentityHolder();

    /**
    ==========================================
    Transactions
    ==========================================
    */

    const {fetchChunk} = useICPTransactions();
    const [icpTransactionsFeature, updateICPTransactionsFeature] = useFeature();
    const [icpTransactionsResponse, setICPTransactionsResponse] = useState<GetAccountIdentifierTransactionsResponse | undefined>(undefined);
    const transactionsLoaded = icpTransactionsFeature.status.loaded;

    const resetICPTransactionsFeature = useCallback(() => {
        setICPTransactionsResponse(undefined);
        updateICPTransactionsFeature({
            status: {inProgress: false, loaded: false},
            error: {isError: false, error: undefined}
        });
    }, [updateICPTransactionsFeature]);

    const fetchTransactionsChunk = useMemo(
        () =>
            reusePromiseWrapper(async () => {
                const logMessagePrefix = `SetSaleIntentionModalDataProvider.fetchTransactionsChunk:`;
                try {
                    const accountIdentifier: AccountIdentifierParam | undefined = accountVariantToAccountIdentifierParamSafe(accountVariant);
                    if (isNullish(accountIdentifier)) {
                        apiLogger.debug(skipMessage(logMessagePrefix, 'no account identifier'));
                        setICPTransactionsResponse(undefined);
                        updateICPTransactionsFeature({
                            status: {inProgress: false, loaded: false},
                            error: {isError: false, error: undefined}
                        });
                        return;
                    }

                    updateICPTransactionsFeature({status: {inProgress: true}});

                    const parameters: GetTransactionsParams = {
                        accountIdentifier,
                        start: undefined,
                        maxResults: 5n,
                        certified: true
                    };
                    const result = await fetchChunk(parameters);
                    setICPTransactionsResponse(result);
                    updateICPTransactionsFeature({
                        status: {inProgress: false, loaded: true},
                        error: {isError: false, error: undefined}
                    });
                } catch (e) {
                    apiLogger.error(caughtErrorMessage(logMessagePrefix), e);
                    setICPTransactionsResponse(undefined);
                    updateICPTransactionsFeature({
                        status: {inProgress: false, loaded: true},
                        error: {isError: true, error: toError(e)}
                    });
                }
            }),
        [fetchChunk, updateICPTransactionsFeature, accountVariant]
    );

    /**
    ==========================================
    Step
    ==========================================
    */

    const [step, setStep] = useState<Step>('loadingInitialData');

    useEffect(() => {
        if (identityHolderLoaded) {
            setStep('choosingAccountSource');
        }
    }, [identityHolderLoaded]);

    useEffect(() => {
        if (transactionsLoaded) {
            setStep('accountConfirmation');
        }
    }, [transactionsLoaded]);

    useEffect(() => {
        switch (step) {
            case 'loadingInitialData': {
                break;
            }
            case 'choosingAccountSource': {
                resetICPTransactionsFeature();
                break;
            }
            case 'enteringAccount': {
                resetICPTransactionsFeature();
                break;
            }
            case 'loadingAccountTransactions': {
                fetchTransactionsChunk();
                break;
            }
            case 'accountConfirmation': {
                break;
            }
            default: {
                const exhaustiveCheck: never = step;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
    }, [fetchTransactionsChunk, resetICPTransactionsFeature, step]);

    /**
    ==========================================
    Action
    ==========================================
    */

    const performAction = useCallback(async () => {
        if (isNullish(accountVariant)) {
            return;
        }
        const ledgerAccount = accountVariantToLedgerAccount(accountVariant);
        if (ownerCanSetSaleIntention) {
            return await setSaleIntention({receiver_account: ledgerAccount});
        } else if (ownerCanChangeSaleIntention) {
            return await changeSaleIntention({receiver_account: ledgerAccount});
        }
    }, [accountVariant, ownerCanSetSaleIntention, ownerCanChangeSaleIntention, setSaleIntention, changeSaleIntention]);

    /**
    ==========================================
    Oisy
    ==========================================
    */

    const [oisyAccountFeature, updateOisyAccountFeature] = useFeature();

    const getAccountFromOisy = useCallback(async () => {
        const logMessagePrefix = `SetSaleIntentionModalDataProvider.getAccountFromOisy:`;
        try {
            updateOisyAccountFeature({status: {inProgress: true}});
            const wallet = createWalletInstance('oisy');
            if (isNullish(wallet)) {
                throw new Error('no wallet');
            }
            const icrcAccounts = await wallet.getAccounts();
            const icrcAccount: IcrcAccount | undefined = icrcAccounts?.[0];
            if (isNullish(icrcAccount)) {
                throw new Error('no icrc account retrieved from Oisy wallet');
            }
            const icrcAccountHex = icrcAccountToHex(icrcAccount);
            if (isEmptyString(icrcAccountHex)) {
                throw new Error('icrc account cannot be encoded');
            }
            updateFormState({accountVariant: icrcAccountHex});
            setStep('loadingAccountTransactions');
            updateOisyAccountFeature({
                status: {inProgress: false, loaded: true},
                error: {isError: false, error: undefined}
            });
        } catch (e) {
            const error = toError(e);
            applicationLogger.error(caughtErrorMessage(logMessagePrefix), error);
            updateOisyAccountFeature({
                status: {inProgress: false, loaded: true},
                error: {isError: true, error}
            });
        }
    }, [updateFormState, updateOisyAccountFeature]);

    /**
    ==========================================
    Action Error panel
    ==========================================
    */

    const actionErrorPanel: ReactNode = useMemo(() => {
        let messageText = i18.common.error.unableTo;
        if (actionFeature?.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? actionFeature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (nonNullish(responseError)) {
            if (hasProperty(responseError, 'CertificateExpirationImminent')) {
                messageText = i18.common.error.certificateExpirationImminent;
            } else if (hasProperty(responseError, 'InvalidAccountIdentifier')) {
                messageText = i18.common.error.inputInvalidAccount;
            }
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(responseError) : undefined} />;
            return <ErrorAlert message={message} />;
        }
    }, [actionFeature, responseError]);

    /**
    ==========================================
    Button props
    ==========================================
    */

    const backButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.children = i18.common.button.cancelButton;
        result.className = 'gf-flex-auto';
        result.onClick = () => {
            onCancelModal();
        };
        switch (step) {
            case 'loadingInitialData': {
                result.disabled = true;
                break;
            }
            case 'choosingAccountSource': {
                break;
            }
            case 'enteringAccount': {
                break;
            }
            case 'loadingAccountTransactions': {
                result.disabled = true;
                break;
            }
            case 'accountConfirmation': {
                result.disabled = actionInProgress;
                break;
            }
            default: {
                const exhaustiveCheck: never = step;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
        return result;
    }, [step, onCancelModal, actionInProgress]);

    const nextButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.children = i18.common.button.confirmButton;
        switch (step) {
            case 'loadingInitialData': {
                result.disabled = true;
                break;
            }
            case 'choosingAccountSource': {
                result.disabled = true;
                result.style = {display: 'none'};
                break;
            }
            case 'enteringAccount': {
                result.disabled = !accountVariantValid;
                result.onClick = () => {
                    setStep('loadingAccountTransactions');
                };
                break;
            }
            case 'loadingAccountTransactions': {
                result.disabled = true;
                break;
            }
            case 'accountConfirmation': {
                result.disabled = actionInProgress || !formDataAvailable;
                result.loading = actionInProgress;
                result.onClick = async () => {
                    const result = await performAction();
                    if (result?.success) {
                        onOkModal?.();
                    }
                };
                break;
            }
            default: {
                const exhaustiveCheck: never = step;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
        return result;
    }, [step, accountVariantValid, actionInProgress, formDataAvailable, performAction, onOkModal]);

    const oisyButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.children = i18.holder.state.holding.modal.setSaleIntention.choosingAccountSource.oisyButton;
        switch (step) {
            case 'loadingInitialData': {
                break;
            }
            case 'choosingAccountSource': {
                result.disabled = oisyAccountFeature.status.inProgress;
                result.loading = oisyAccountFeature.status.inProgress;
                result.onClick = async () => {
                    getAccountFromOisy();
                };
                break;
            }
            case 'enteringAccount':
            case 'loadingAccountTransactions':
            case 'accountConfirmation': {
                break;
            }
            default: {
                const exhaustiveCheck: never = step;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
        return result;
    }, [getAccountFromOisy, oisyAccountFeature.status.inProgress, step]);

    const manualButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.children = i18.holder.state.holding.modal.setSaleIntention.choosingAccountSource.manualButton;
        switch (step) {
            case 'loadingInitialData': {
                break;
            }
            case 'choosingAccountSource': {
                result.disabled = oisyAccountFeature.status.inProgress;
                result.onClick = () => {
                    setStep('enteringAccount');
                };
                break;
            }
            case 'enteringAccount':
            case 'loadingAccountTransactions':
            case 'accountConfirmation': {
                break;
            }
            default: {
                const exhaustiveCheck: never = step;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
        return result;
    }, [oisyAccountFeature.status.inProgress, step]);

    /**
    ==========================================
    Modal title
    ==========================================
    */

    const modalTitle = useMemo(() => {
        return step == 'loadingInitialData' || step == 'choosingAccountSource' || step == 'enteringAccount'
            ? i18.holder.state.holding.modal.setSaleIntention.title.enter
            : i18.holder.state.holding.modal.setSaleIntention.title.confirm;
    }, [step]);

    const formControlsDisabled = actionInProgress;

    const value = useMemo<Context>(() => {
        return {
            step,
            icpTransactionsResponse,
            icpTransactionsFeature,
            fetchTransactionsChunk,
            actionErrorPanel,
            backButtonProps,
            nextButtonProps,
            oisyButtonProps,
            manualButtonProps,
            formControlsDisabled,
            modalTitle
        };
    }, [
        actionErrorPanel,
        backButtonProps,
        fetchTransactionsChunk,
        formControlsDisabled,
        icpTransactionsFeature,
        icpTransactionsResponse,
        manualButtonProps,
        modalTitle,
        nextButtonProps,
        oisyButtonProps,
        step
    ]);
    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
