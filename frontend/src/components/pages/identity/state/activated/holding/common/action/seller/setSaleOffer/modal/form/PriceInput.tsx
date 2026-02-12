import {ICPToken, isNullish} from '@dfinity/utils';
import {InputFormItem} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {i18} from 'frontend/src/i18';
import {formatAtomicAmount} from 'frontend/src/utils/core/number/atomic/atomic';
import {useCallback} from 'react';
import {useSetSaleOfferModalDataContext} from '../SetSaleOfferModalDataProvider';
import {useSetSaleOfferModalFormDataContext} from '../SetSaleOfferModalFormDataProvider';

export const PriceInput = () => {
    const {formState, updateFormState, formValidationState} = useSetSaleOfferModalFormDataContext();
    const {formControlsDisabled} = useSetSaleOfferModalDataContext();

    const setValue = useCallback(
        (value: string | undefined) => {
            updateFormState({price: value});
        },
        [updateFormState]
    );

    const onBlur = useCallback(() => {
        if (isNullish(formValidationState.price)) {
            return;
        }
        if (formValidationState.price.type == 'valid') {
            const value = formatAtomicAmount(formValidationState.price.priceUlps, ICPToken.decimals);
            updateFormState({price: value});
        } else {
            const value = formatAtomicAmount(formValidationState.price.validatedInputValue, ICPToken.decimals);
            updateFormState({price: value});
        }
    }, [formValidationState.price, updateFormState]);

    return (
        <InputFormItem
            value={formState.price}
            setValue={setValue}
            onBlur={onBlur}
            disabled={formControlsDisabled}
            placeholder={i18.holder.state.holding.modal.setSaleOffer.price.placeholder}
            label={i18.holder.state.holding.modal.setSaleOffer.price.label}
            style={{textAlign: 'right'}}
            suffix={ICPToken.symbol}
            {...formValidationState.price}
        />
    );
};
