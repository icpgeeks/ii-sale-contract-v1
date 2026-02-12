import {InputFormItem} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {useContractNotActivatedAuthorizedDataContext} from './ContractNotActivatedAuthorizedDataProvider';
import {useContractNotActivatedAuthorizedFormDataContext} from './ContractNotActivatedAuthorizedFormDataProvider';

export const ActivationCodeInput = () => {
    const {formState, updateFormState, formValidationState} = useContractNotActivatedAuthorizedFormDataContext();
    const {formControlsDisabled} = useContractNotActivatedAuthorizedDataContext();

    const setValue = useCallback(
        (value: string | undefined) => {
            updateFormState({
                activationCode: value
            });
        },
        [updateFormState]
    );

    return (
        <InputFormItem
            value={formState.activationCode}
            setValue={setValue}
            disabled={formControlsDisabled}
            placeholder={i18.contract.activation.notActivated.form.codeInputPlaceholder}
            label={i18.contract.activation.notActivated.form.codeInputLabel}
            {...formValidationState.activationCode}
        />
    );
};
