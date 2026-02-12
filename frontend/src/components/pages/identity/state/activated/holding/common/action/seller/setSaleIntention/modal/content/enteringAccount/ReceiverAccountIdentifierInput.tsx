import {TextareaFormItem} from 'frontend/src/components/widgets/form/textareaFormItem/TextareaFormItem';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {useSetSaleIntentionModalFormDataContext} from '../../SetSaleIntentionModalFormDataProvider';

export const ReceiverAccountIdentifierInput = () => {
    const {formState, updateFormState, formValidationState} = useSetSaleIntentionModalFormDataContext();

    const setValue = useCallback(
        (value: string | undefined) => {
            updateFormState({accountVariant: value});
        },
        [updateFormState]
    );

    return (
        <TextareaFormItem
            value={formState.accountVariant}
            setValue={setValue}
            placeholder={i18.holder.state.holding.modal.setSaleIntention.enter.payoutAddress.placeholder}
            label={i18.holder.state.holding.modal.setSaleIntention.enter.payoutAddress.label}
            {...formValidationState.accountVariant}
        />
    );
};
