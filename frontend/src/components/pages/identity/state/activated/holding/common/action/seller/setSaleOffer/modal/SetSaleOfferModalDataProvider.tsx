import {nonNullish} from '@dfinity/utils';
import {type ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {DEVELOPER_REWARD_PERMYRIAD, HUB_REWARD_PERMYRIAD, REFERRAL_REWARD_PERMYRIAD} from 'frontend/src/constants';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {useOwnerCanCancelSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanCancelSaleIntention';
import {useOwnerCanSetSaleOffer} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanSetSaleOffer';
import {useSetSaleOffer} from 'frontend/src/context/identityHolder/state/holding/useSetSaleOffer';
import {useRefetchIdentityHolder} from 'frontend/src/context/identityHolder/useRefetchIdentityHolder';
import {useICRCMetadata} from 'frontend/src/context/ledger/icrc/useICRCMetadata';
import {i18} from 'frontend/src/i18';
import type {DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {MAINNET_LEDGER_CANISTER_ID} from 'frontend/src/utils/ic/constants';
import {createContext, useCallback, useContext, useEffect, useMemo, type PropsWithChildren, type ReactNode} from 'react';
import type {SetSaleOfferArgs} from 'src/declarations/contract/contract.did';
import {sendOpenCancelSaleOfferModalNotification} from '../../cancelSaleIntention/modal/CancelSaleIntentionModalRenderer';
import {useSetSaleOfferModalFormDataContext} from './SetSaleOfferModalFormDataProvider';
import {EstimatesCalculator, type Estimates} from './estimatesCalculator';

type ActionAvailability = DataAvailability<{priceUlps: bigint}> | {type: 'dataNotAvailable'};

type Context = {
    refetchICRCMetadata: () => void;
    refetchICRCMetadataInProgress: boolean;

    okButtonProps: ButtonProps;
    cancelButtonProps: ButtonProps;
    cancelSaleOfferButtonVisible: boolean;
    cancelSaleOfferButtonProps?: ButtonProps;

    formControlsDisabled: boolean;
    modalTitle: ReactNode;
    modalSubTitle: ReactNode;
    actionErrorPanel: ReactNode;

    actionAvailability: ActionAvailability;

    estimates?: Estimates;
};

const Context = createContext<Context | undefined>(undefined);
export const useSetSaleOfferModalDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useSetSaleOfferModalDataContext must be used within a SetSaleOfferModalDataProvider');
    }
    return context;
};

type Props = {
    onCancelModal: () => void;
};
export const SetSaleOfferModalDataProvider = (props: PropsWithChildren<Props>) => {
    const {formDataAvailability, formValidationState} = useSetSaleOfferModalFormDataContext();
    const {onCancelModal} = props;
    const identityHolderLoaded = useRefetchIdentityHolder();
    const ownerCanSetSaleOffer = useOwnerCanSetSaleOffer();
    const ownerCanCancelSaleIntention = useOwnerCanCancelSaleIntention();
    const {setSaleOffer, feature, responseError} = useSetSaleOffer();
    const actionInProgress = feature.status.inProgress;
    const saleStatus = useIdentityHolderSaleStatus();
    const isListedWithPrice = saleStatus.type == 'listed';
    const {fetchMetadata, metadataDataAvailability, metadataFeature} = useICRCMetadata(MAINNET_LEDGER_CANISTER_ID);

    /**
    ==========================================
    ICRC Metadata
    ==========================================
    */

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    /**
    ==========================================
    ActionAvailability
    ==========================================
    */

    const actionAvailability = useMemo<ActionAvailability>(() => {
        if (!identityHolderLoaded || metadataDataAvailability.type == 'loading') {
            return {type: 'loading'};
        }
        if (metadataDataAvailability.type == 'notAvailable') {
            return {type: 'dataNotAvailable'};
        }
        if (!ownerCanSetSaleOffer || formDataAvailability.type != 'available') {
            return {type: 'notAvailable'};
        }
        return {type: 'available', priceUlps: formDataAvailability.priceUlps};
    }, [ownerCanSetSaleOffer, formDataAvailability, identityHolderLoaded, metadataDataAvailability]);

    /**
    ==========================================
    Action
    ==========================================
    */

    const performAction = useCallback(async () => {
        if (actionAvailability.type != 'available') {
            return;
        }
        const parameters: SetSaleOfferArgs = {
            price: actionAvailability.priceUlps
        };
        return await setSaleOffer(parameters);
    }, [actionAvailability, setSaleOffer]);

    /**
    ==========================================
    Button props
    ==========================================
    */

    const okButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.children = isListedWithPrice ? i18.holder.state.holding.modal.setSaleOffer.editButton : i18.holder.state.holding.modal.setSaleOffer.setButton;
        result.disabled = actionInProgress || actionAvailability.type != 'available';
        result.loading = actionInProgress;
        result.onClick = async () => {
            const result = await performAction();
            if (result?.success) {
                onCancelModal();
            }
        };
        return result;
    }, [actionAvailability.type, actionInProgress, onCancelModal, performAction, isListedWithPrice]);

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

    const [cancelSaleOfferButtonVisible, cancelSaleOfferButtonProps]: [boolean, ButtonProps | undefined] = useMemo(() => {
        if (!ownerCanCancelSaleIntention) {
            return [false, undefined];
        }

        return [
            true,
            {
                danger: true,
                children: i18.holder.state.holding.modal.setSaleOffer.removeButton,
                onClick: () => {
                    onCancelModal();
                    sendOpenCancelSaleOfferModalNotification();
                }
            }
        ];
    }, [ownerCanCancelSaleIntention, onCancelModal]);

    /**
    ==========================================
    Modal title/subTitle
    ==========================================
    */

    const [modalTitle, modalSubTitle] = useMemo(() => {
        return isListedWithPrice
            ? [i18.holder.state.holding.modal.setSaleOffer.title.edit, i18.holder.state.holding.modal.setSaleOffer.description.edit]
            : [i18.holder.state.holding.modal.setSaleOffer.title.set, i18.holder.state.holding.modal.setSaleOffer.description.set];
    }, [isListedWithPrice]);

    /**
    ==========================================
    Action Error panel
    ==========================================
    */

    const actionErrorPanel: ReactNode = useMemo(() => {
        let messageText = i18.common.error.unableTo;
        if (feature.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? feature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (nonNullish(responseError)) {
            if (hasProperty(responseError, 'HigherBuyerOfferExists')) {
                messageText = i18.holder.state.holding.modal.setSaleOffer.stub.error.higherBuyerOfferExists;
            }
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(responseError) : undefined} />;
            return <ErrorAlert message={message} />;
        }
    }, [feature.error, responseError]);

    /**
    ==========================================
    Estimates
    ==========================================
    */

    const estimates = useMemo<Estimates | undefined>(() => {
        if (formValidationState.price?.type != 'valid' || metadataDataAvailability.type != 'available') {
            return undefined;
        }
        const {priceUlps} = formValidationState.price;
        return new EstimatesCalculator(priceUlps, metadataDataAvailability.metadata.fee, REFERRAL_REWARD_PERMYRIAD, DEVELOPER_REWARD_PERMYRIAD, HUB_REWARD_PERMYRIAD).getEstimates();
    }, [formValidationState, metadataDataAvailability]);

    /**
    ==========================================
    Refetch ICRC Metadata
    ==========================================
    */

    const refetchICRCMetadata = useCallback(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    const refetchICRCMetadataInProgress = metadataFeature.status.inProgress;

    const formControlsDisabled = actionInProgress;

    const value = useMemo<Context>(() => {
        return {
            refetchICRCMetadata,
            refetchICRCMetadataInProgress,

            okButtonProps,
            cancelButtonProps,
            cancelSaleOfferButtonVisible,
            cancelSaleOfferButtonProps,

            formControlsDisabled,

            modalTitle,
            modalSubTitle,
            actionErrorPanel,

            actionAvailability,

            estimates
        };
    }, [
        refetchICRCMetadata,
        refetchICRCMetadataInProgress,
        okButtonProps,
        cancelButtonProps,
        cancelSaleOfferButtonVisible,
        cancelSaleOfferButtonProps,
        formControlsDisabled,
        modalTitle,
        modalSubTitle,
        actionErrorPanel,
        actionAvailability,
        estimates
    ]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
