import {InputFormItem} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {useAuthnMethodRegistrationModeEnterInvalidRegistrationIdDataContext} from './AuthnMethodRegistrationModeEnterInvalidRegistrationIdDataProvider';
import {useAuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataContext} from './AuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataProvider';

export const RegistrationIdInput = () => {
    const {formState, updateFormState, formValidationState} = useAuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataContext();
    const {formControlsDisabled} = useAuthnMethodRegistrationModeEnterInvalidRegistrationIdDataContext();

    const setValue = useCallback(
        (value: string | undefined) => {
            updateFormState({
                registrationId: value
            });
        },
        [updateFormState]
    );

    return (
        <InputFormItem
            value={formState.registrationId}
            setValue={setValue}
            disabled={formControlsDisabled}
            placeholder={i18.holder.state.release.enterAuthnMethodRegistrationModeFail.form.registrationId.placeholder}
            noStyle
            {...formValidationState.registrationId}
        />
    );
};
