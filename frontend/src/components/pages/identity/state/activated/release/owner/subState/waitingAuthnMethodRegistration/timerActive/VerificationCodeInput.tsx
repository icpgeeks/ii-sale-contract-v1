import {InputFormItem} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {useWaitingAuthnMethodRegistrationDataContext} from '../WaitingAuthnMethodRegistrationDataProvider';
import {useWaitingAuthnMethodRegistrationFormDataContext} from '../WaitingAuthnMethodRegistrationFormDataProvider';

export const VerificationCodeInput = () => {
    const {formState, updateFormState, formValidationState} = useWaitingAuthnMethodRegistrationFormDataContext();
    const {formControlsDisabled} = useWaitingAuthnMethodRegistrationDataContext();

    const setValue = useCallback(
        (value: string | undefined) => {
            updateFormState({
                verificationCode: value
            });
        },
        [updateFormState]
    );

    return (
        <InputFormItem
            value={formState.verificationCode}
            setValue={setValue}
            disabled={formControlsDisabled}
            placeholder={i18.holder.state.release.waitingAuthnMethodRegistration.form.verificationCode.placeholder}
            noStyle
            {...formValidationState.verificationCode}
        />
    );
};
