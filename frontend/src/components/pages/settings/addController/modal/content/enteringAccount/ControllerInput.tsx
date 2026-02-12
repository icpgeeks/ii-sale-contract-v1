import {TextareaFormItem} from 'frontend/src/components/widgets/form/textareaFormItem/TextareaFormItem';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {useAddControllerModalFormDataContext} from '../../AddControllerModalFormDataProvider';

export const ControllerInput = () => {
    const {formState, updateFormState, formValidationState} = useAddControllerModalFormDataContext();

    const setValue = useCallback(
        (value: string | undefined) => {
            updateFormState({principal: value});
        },
        [updateFormState]
    );

    return (
        <TextareaFormItem
            value={formState.principal}
            setValue={setValue}
            placeholder={i18.settings.danger.addController.modal.principal.placeholder}
            label={i18.settings.danger.addController.modal.principal.label}
            maxLength={63}
            {...formValidationState.principal}
        />
    );
};
