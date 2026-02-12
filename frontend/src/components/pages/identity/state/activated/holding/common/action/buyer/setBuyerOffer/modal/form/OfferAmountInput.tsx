import {ICPToken, isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {InputFormItem} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {i18} from 'frontend/src/i18';
import {formatAtomicAmount} from 'frontend/src/utils/core/number/atomic/atomic';
import {useCallback} from 'react';
import {useSetBuyerOfferModalDataContext} from '../SetBuyerOfferModalDataProvider';
import {useSetBuyerOfferModalFormDataContext} from '../SetBuyerOfferModalFormDataProvider';

export const OfferAmountInput = () => {
    const {formState, updateFormState, formValidationState} = useSetBuyerOfferModalFormDataContext();
    const {formControlsDisabled} = useSetBuyerOfferModalDataContext();

    const setValue = useCallback(
        (value: string | undefined) => {
            updateFormState({offerAmount: value});
        },
        [updateFormState]
    );

    const onBlur = useCallback(() => {
        if (isNullish(formValidationState.offerAmount)) {
            return;
        }
        if (formValidationState.offerAmount.type == 'valid') {
            const value = formatAtomicAmount(formValidationState.offerAmount.offerAmountUlps, ICPToken.decimals);
            updateFormState({offerAmount: value});
        } else {
            const value = formatAtomicAmount(formValidationState.offerAmount.validatedInputValue, ICPToken.decimals);
            updateFormState({offerAmount: value});
        }
    }, [formValidationState.offerAmount, updateFormState]);

    return (
        <Flex vertical gap={8}>
            <InputFormItem
                value={formState.offerAmount}
                setValue={setValue}
                onBlur={onBlur}
                disabled={formControlsDisabled}
                placeholder={i18.holder.state.holding.modal.makeOffer.offerAmount.placeholder}
                label={i18.holder.state.holding.modal.makeOffer.offerAmount.label}
                style={{textAlign: 'right'}}
                suffix={ICPToken.symbol}
                {...formValidationState.offerAmount}
            />
        </Flex>
    );
};
