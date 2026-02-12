import {ICPToken, nonNullish} from '@dfinity/utils';
import type {InputFormItemState} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {type ExtractValidStatus, validatePositiveAmountUlps, type ValidationStatus} from 'frontend/src/components/widgets/form/inputFormItem/inputFormItemUtils';
import {MAX_SALE_PRICE_ICP_ULPS, MIN_PRICE_ICP_INCLUSIVE_ULPS} from 'frontend/src/constants';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {useIdentityHolderCurrentUserBuyerOffer} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderCurrentUserBuyerOffer';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {type DataAvailability, useSimpleReducer} from 'frontend/src/utils/core/feature/feature';
import {formatAtomicAmount} from 'frontend/src/utils/core/number/atomic/atomic';
import {calculatePercentageDifferenceUnsafe} from 'frontend/src/utils/core/number/calculation';
import {createContext, type Dispatch, type PropsWithChildren, type ReactNode, useContext, useEffect, useMemo} from 'react';
import {getDiscountFromTotalValue} from '../../../../../subState/hold/identity/topPanel/price/ListedPriceDiscountFromTotalValue';

type FormState = {
    offerAmount?: string;
};

type OfferAmountValidationStatus = ValidationStatus<{offerAmountUlps: bigint} & InputFormItemState, {validatedInputValue: bigint | undefined} & InputFormItemState>;
type FormValidationState = {
    offerAmount?: OfferAmountValidationStatus;
};

type FormDataAvailability = DataAvailability<ExtractValidStatus<OfferAmountValidationStatus>>;

type Context = {
    formState: FormState;
    updateFormState: Dispatch<Partial<FormState>>;

    formValidationState: FormValidationState;

    formDataAvailability: FormDataAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useSetBuyerOfferModalFormDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useSetBuyerOfferModalFormDataContext must be used within a SetBuyerOfferModalFormDataProvider');
    }
    return context;
};

export const SetBuyerOfferModalFormDataProvider = (props: PropsWithChildren) => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const linkedAssetsTotalValueUlps = linkedAssets.type == 'assets' ? linkedAssets.totalValueUlps : undefined;

    const {status: buyerOfferStatus} = useIdentityHolderCurrentUserBuyerOffer();
    const storedOfferAmountUlps: bigint | undefined = useMemo(() => {
        if (buyerOfferStatus.type != 'buyerOffer') {
            return undefined;
        }
        return buyerOfferStatus.buyerOffer.value.offer_amount;
    }, [buyerOfferStatus]);

    /**
    ==========================================
    Form State
    ==========================================
    */

    const [formState, updateFormState] = useSimpleReducer<FormState, Partial<FormState>>();

    useEffect(() => {
        updateFormState({
            offerAmount: formatAtomicAmount(storedOfferAmountUlps, ICPToken.decimals)
        });
    }, [storedOfferAmountUlps, updateFormState]);

    /**
    ==========================================
    Form Data Validation/Availability
    ==========================================
    */

    const [formValidationState, formDataAvailability] = useMemo<[FormValidationState, FormDataAvailability]>(() => {
        /**
         * validation
         */
        const validatedOfferAmount = validateOffer(formState.offerAmount, linkedAssetsTotalValueUlps);
        const formValidationState: FormValidationState = {
            offerAmount: validatedOfferAmount
        };
        /**
         * availability
         */
        const formDataAvailability: FormDataAvailability =
            validatedOfferAmount.type == 'invalid'
                ? {type: 'notAvailable'}
                : {
                      type: 'available',
                      offerAmountUlps: validatedOfferAmount.offerAmountUlps
                  };

        return [formValidationState, formDataAvailability];
    }, [formState.offerAmount, linkedAssetsTotalValueUlps]);

    const value = useMemo<Context>(() => {
        return {
            formState,
            updateFormState,
            formValidationState,
            formDataAvailability
        };
    }, [formState, updateFormState, formValidationState, formDataAvailability]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};

const validateOffer = (raw: string | undefined, linkedAssetsTotalValueUlps: bigint | undefined): OfferAmountValidationStatus => {
    const result = validatePositiveAmountUlps(raw);
    if (result.type == 'invalid') {
        if (nonNullish(result.cause)) {
            switch (result.cause) {
                case 'empty':
                    return {type: 'invalid', validatedInputValue: undefined};
                case 'zero':
                    return {type: 'invalid', validatedInputValue: undefined};
                default: {
                    const exhaustiveCheck: never = result.cause;
                    applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                }
            }
        }
        return {type: 'invalid', error: i18.holder.state.holding.modal.makeOffer.offerAmount.error.inputInvalidOffer, status: 'error', validatedInputValue: undefined};
    }
    const offerAmountUlps = result.ulps;
    if (offerAmountUlps < MIN_PRICE_ICP_INCLUSIVE_ULPS) {
        return {type: 'invalid', error: i18.holder.state.holding.modal.makeOffer.offerAmount.error.inputOfferTooLow, status: 'error', validatedInputValue: offerAmountUlps};
    }
    if (offerAmountUlps > MAX_SALE_PRICE_ICP_ULPS) {
        return {type: 'invalid', error: i18.holder.state.holding.modal.makeOffer.offerAmount.error.inputInvalidOffer, status: 'error', validatedInputValue: undefined};
    }

    let warning: ReactNode = null;
    if (nonNullish(linkedAssetsTotalValueUlps) && linkedAssetsTotalValueUlps > 0n) {
        const discount = calculatePercentageDifferenceUnsafe(offerAmountUlps, linkedAssetsTotalValueUlps);
        warning = getDiscountFromTotalValue(discount);
    }

    return {type: 'valid', error: warning, offerAmountUlps};
};
