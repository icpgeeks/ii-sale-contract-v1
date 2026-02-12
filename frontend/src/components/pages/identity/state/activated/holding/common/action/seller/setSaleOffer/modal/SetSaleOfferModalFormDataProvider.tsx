import {ICPToken, nonNullish} from '@dfinity/utils';
import type {InputFormItemState} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {type ExtractValidStatus, validatePositiveAmountUlps, type ValidationStatus} from 'frontend/src/components/widgets/form/inputFormItem/inputFormItemUtils';
import {MAX_SALE_PRICE_ICP_ULPS, MIN_PRICE_ICP_INCLUSIVE_ULPS} from 'frontend/src/constants';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {type DataAvailability, useSimpleReducer} from 'frontend/src/utils/core/feature/feature';
import {formatAtomicAmount} from 'frontend/src/utils/core/number/atomic/atomic';
import {calculatePercentageDifferenceUnsafe} from 'frontend/src/utils/core/number/calculation';
import {createContext, type Dispatch, type PropsWithChildren, type ReactNode, useContext, useEffect, useMemo} from 'react';
import {getDiscountFromTotalValue} from '../../../../../subState/hold/identity/topPanel/price/ListedPriceDiscountFromTotalValue';

type FormState = {
    price?: string;
};

type PriceValidationStatus = ValidationStatus<{priceUlps: bigint} & InputFormItemState, {validatedInputValue: bigint | undefined} & InputFormItemState>;
type FormValidationState = {
    price?: PriceValidationStatus;
};

type FormDataAvailability = DataAvailability<ExtractValidStatus<PriceValidationStatus>>;

type Context = {
    formState: FormState;
    updateFormState: Dispatch<Partial<FormState>>;

    formValidationState: FormValidationState;

    formDataAvailability: FormDataAvailability;
};

const Context = createContext<Context | undefined>(undefined);
export const useSetSaleOfferModalFormDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useSetSaleOfferModalFormDataContext must be used within a SetSaleOfferModalFormDataProvider');
    }
    return context;
};

export const SetSaleOfferModalFormDataProvider = (props: PropsWithChildren) => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const linkedAssetsTotalValueUlps = linkedAssets.type == 'assets' ? linkedAssets.totalValueUlps : undefined;
    const saleStatus = useIdentityHolderSaleStatus();
    const salePrice = saleStatus.type == 'listed' ? saleStatus.price : undefined;

    /**
    ==========================================
    Form State
    ==========================================
    */

    const [formState, updateFormState] = useSimpleReducer<FormState, Partial<FormState>>();

    useEffect(() => {
        updateFormState({
            price: formatAtomicAmount(salePrice, ICPToken.decimals)
        });
    }, [salePrice, updateFormState]);

    /**
    ==========================================
    Form Data Validation/Availability
    ==========================================
    */

    const [formValidationState, formDataAvailability] = useMemo<[FormValidationState, FormDataAvailability]>(() => {
        /**
         * validation
         */
        const validatedPrice = validatePrice(formState.price, linkedAssetsTotalValueUlps);
        const formValidationState: FormValidationState = {
            price: validatedPrice
        };

        /**
         * availability
         */
        const formDataAvailability: FormDataAvailability =
            validatedPrice.type == 'invalid'
                ? {type: 'notAvailable'}
                : {
                      type: 'available',
                      priceUlps: validatedPrice.priceUlps
                  };

        return [formValidationState, formDataAvailability];
    }, [formState.price, linkedAssetsTotalValueUlps]);

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

const validatePrice = (raw: string | undefined, linkedAssetsTotalValueUlps: bigint | undefined): PriceValidationStatus => {
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
        return {type: 'invalid', error: i18.holder.state.holding.modal.setSaleOffer.price.error.inputInvalidPrice, status: 'error', validatedInputValue: undefined};
    }
    const priceUlps = result.ulps;
    if (priceUlps < MIN_PRICE_ICP_INCLUSIVE_ULPS) {
        return {type: 'invalid', error: i18.holder.state.holding.modal.setSaleOffer.price.error.tooLow, status: 'error', validatedInputValue: priceUlps};
    }
    if (priceUlps > MAX_SALE_PRICE_ICP_ULPS) {
        return {type: 'invalid', error: i18.holder.state.holding.modal.setSaleOffer.price.error.inputInvalidPrice, status: 'error', validatedInputValue: undefined};
    }

    let warning: ReactNode = null;
    if (nonNullish(linkedAssetsTotalValueUlps) && linkedAssetsTotalValueUlps > 0n) {
        const discount = calculatePercentageDifferenceUnsafe(priceUlps, linkedAssetsTotalValueUlps);
        warning = getDiscountFromTotalValue(discount);
    }
    return {type: 'valid', error: warning, priceUlps};
};
