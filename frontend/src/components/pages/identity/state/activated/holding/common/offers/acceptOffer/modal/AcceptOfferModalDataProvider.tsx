import type {Principal} from '@dfinity/principal';
import {isNullish, nonNullish} from '@dfinity/utils';
import type {ButtonProps} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {DEVELOPER_REWARD_PERMYRIAD, HUB_REWARD_PERMYRIAD, REFERRAL_REWARD_PERMYRIAD} from 'frontend/src/constants';
import {useAcceptBuyerOffer} from 'frontend/src/context/identityHolder/state/holding/useAcceptBuyerOffer';
import {useIdentityHolderBuyerOffer} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderBuyerOffer';
import {useOwnerCanAcceptBuyerOffer} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanAcceptBuyerOffer';
import {useRefetchIdentityHolder} from 'frontend/src/context/identityHolder/useRefetchIdentityHolder';
import {useICRCMetadata} from 'frontend/src/context/ledger/icrc/useICRCMetadata';
import {i18} from 'frontend/src/i18';
import type {DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {MAINNET_LEDGER_CANISTER_ID} from 'frontend/src/utils/ic/constants';
import {createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren, type ReactNode} from 'react';
import type {AcceptBuyerOfferArgs} from 'src/declarations/contract/contract.did';
import {EstimatesCalculator, type Estimates} from '../../../action/seller/setSaleOffer/modal/estimatesCalculator';
import {sendOpenAcceptOfferModalNotification} from '../AcceptOfferModalRenderer';

type ActionAvailability = DataAvailability<{offerAmount: bigint; buyer: Principal}, {offerDoesNotExist?: boolean}>;

type Context = {
    offerTimestamp?: bigint;
    offerAmount?: bigint;

    refetchICRCMetadata: () => void;
    refetchICRCMetadataInProgress: boolean;

    changeBuyer: (buyer: Principal) => void;

    okButtonProps: ButtonProps;
    cancelButtonProps: ButtonProps;

    actionErrorPanel: ReactNode;

    actionAvailability: ActionAvailability;

    estimates?: Estimates;
};

const Context = createContext<Context | undefined>(undefined);
export const useAcceptOfferModalDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useAcceptOfferModalDataContext must be used within a AcceptOfferModalDataProvider');
    }
    return context;
};

type Props = {
    buyer: Principal | undefined;
    onCancelModal: () => void;
    onAcceptedOfferRemoved: () => void;
};
export const AcceptOfferModalDataProvider = (props: PropsWithChildren<Props>) => {
    const {onCancelModal, onAcceptedOfferRemoved} = props;
    const [currentBuyer] = useState<Principal | undefined>(props.buyer);
    const identityHolderLoaded = useRefetchIdentityHolder();
    const ownerCanAcceptOffer = useOwnerCanAcceptBuyerOffer();
    const {acceptBuyerOffer, feature, responseError} = useAcceptBuyerOffer();
    const actionInProgress = feature.status.inProgress;
    const {fetchMetadata, metadataDataAvailability, metadataFeature} = useICRCMetadata(MAINNET_LEDGER_CANISTER_ID);
    const [shouldCheckHigherOffer, setShouldCheckHigherOffer] = useState<boolean>(true);

    /**
    ==========================================
    ICRC Metadata
    ==========================================
    */

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    const changeBuyer = useCallback((buyer: Principal) => {
        sendOpenAcceptOfferModalNotification({buyer});
    }, []);

    /**
    ==========================================
    Offer Amount
    ==========================================
    */

    const {status: buyerOfferStatus} = useIdentityHolderBuyerOffer(currentBuyer);

    const {offerAmountUlps, offerTimestamp} = useMemo<{
        offerAmountUlps: bigint | undefined;
        offerTimestamp: bigint | undefined;
    }>(() => {
        if (buyerOfferStatus.type != 'buyerOffer') {
            return {
                offerAmountUlps: undefined,
                offerTimestamp: undefined
            };
        }
        const {buyerOffer} = buyerOfferStatus;
        const {
            value: {offer_amount: offerAmountUlps},
            timestamp: offerTimestamp
        } = buyerOffer;
        return {
            offerAmountUlps,
            offerTimestamp
        };
    }, [buyerOfferStatus]);

    useEffect(() => {
        if (identityHolderLoaded && isNullish(offerAmountUlps)) {
            onCancelModal();
        }
    }, [identityHolderLoaded, offerAmountUlps, onCancelModal]);

    useEffect(() => {
        if (nonNullish(responseError)) {
            if (hasProperty(responseError, 'OfferRemoved') || hasProperty(responseError, 'OfferNotFound')) {
                onAcceptedOfferRemoved();
            } else {
                setShouldCheckHigherOffer(!hasProperty(responseError, 'HigherBuyerOfferExists'));
            }
        }
    }, [onAcceptedOfferRemoved, responseError]);

    /**
    ==========================================
    ActionAvailability
    ==========================================
    */

    const actionAvailability = useMemo<ActionAvailability>(() => {
        if (!identityHolderLoaded || metadataDataAvailability.type == 'loading') {
            return {type: 'loading'};
        }
        if (isNullish(currentBuyer) || isNullish(offerAmountUlps)) {
            return {type: 'notAvailable', offerDoesNotExist: true};
        }
        if (!ownerCanAcceptOffer || metadataDataAvailability.type == 'notAvailable') {
            return {type: 'notAvailable'};
        }
        return {type: 'available', offerAmount: offerAmountUlps, buyer: currentBuyer};
    }, [currentBuyer, identityHolderLoaded, metadataDataAvailability.type, offerAmountUlps, ownerCanAcceptOffer]);

    /**
    ==========================================
    Action
    ==========================================
    */

    const performAction = useCallback(async () => {
        if (actionAvailability.type != 'available') {
            return;
        }
        const parameters: AcceptBuyerOfferArgs = {
            buyer: actionAvailability.buyer,
            offer_amount: actionAvailability.offerAmount,
            check_higher_offer: shouldCheckHigherOffer
        };
        return await acceptBuyerOffer(parameters);
    }, [acceptBuyerOffer, actionAvailability, shouldCheckHigherOffer]);

    /**
    ==========================================
    Button props
    ==========================================
    */

    const okButtonProps: ButtonProps = useMemo(() => {
        const result: ButtonProps = {};
        result.className = 'gf-flex-auto';
        result.children = shouldCheckHigherOffer ? i18.holder.state.holding.modal.acceptOffer.button : i18.holder.state.holding.modal.acceptOffer.betterOfferWarning.button;
        result.disabled = actionInProgress || actionAvailability.type != 'available';
        result.loading = actionInProgress;
        result.onClick = async () => {
            const result = await performAction();
            if (result?.success) {
                onCancelModal();
            }
        };
        return result;
    }, [actionAvailability, actionInProgress, onCancelModal, performAction, shouldCheckHigherOffer]);

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
        let messageText = i18.common.error.unableTo;
        if (feature.error.isError) {
            const message = <ErrorMessageText message={messageText} errorDebugContext={IS_DEBUG_ENABLED ? feature.error.error?.message : undefined} />;
            return <ErrorAlert message={message} />;
        } else if (nonNullish(responseError)) {
            if (hasProperty(responseError, 'HigherBuyerOfferExists')) {
                return <WarningAlert message={i18.holder.state.holding.modal.acceptOffer.betterOfferWarning.description} />;
            } else if (hasProperty(responseError, 'OfferMismatch')) {
                messageText = i18.holder.state.holding.modal.acceptOffer.stub.error.offerChanged;
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
        if (isNullish(offerAmountUlps) || metadataDataAvailability.type != 'available') {
            return undefined;
        }
        return new EstimatesCalculator(offerAmountUlps, metadataDataAvailability.metadata.fee, REFERRAL_REWARD_PERMYRIAD, DEVELOPER_REWARD_PERMYRIAD, HUB_REWARD_PERMYRIAD).getEstimates();
    }, [offerAmountUlps, metadataDataAvailability]);

    /**
    ==========================================
    Refresh all
    ==========================================
    */

    const refetchICRCMetadata = useCallback(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    const refetchICRCMetadataInProgress = metadataFeature.status.inProgress;

    const value = useMemo<Context>(() => {
        return {
            offerAmount: offerAmountUlps,
            offerTimestamp,

            refetchICRCMetadata,
            refetchICRCMetadataInProgress,

            changeBuyer,

            okButtonProps,
            cancelButtonProps,

            actionErrorPanel,

            actionAvailability,

            estimates
        };
    }, [actionAvailability, actionErrorPanel, cancelButtonProps, changeBuyer, refetchICRCMetadata, refetchICRCMetadataInProgress, offerAmountUlps, offerTimestamp, okButtonProps, estimates]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
