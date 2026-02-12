import {AbstractCheckbox} from 'frontend/src/components/widgets/form/AbstractCheckbox';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {useNeedConfirmAuthnMethodSessionRegistrationDataContext} from '../NeedConfirmAuthnMethodSessionRegistrationDataProvider';
import {useNeedConfirmAuthnMethodSessionRegistrationFormDataContext} from '../NeedConfirmAuthnMethodSessionRegistrationFormDataProvider';

export const AgreementCheckbox = (props: {disabled?: boolean}) => {
    const {formState, updateFormState} = useNeedConfirmAuthnMethodSessionRegistrationFormDataContext();
    const {formControlsDisabled} = useNeedConfirmAuthnMethodSessionRegistrationDataContext();

    const onClick = useCallback(() => {
        updateFormState({
            userAgreementChecked: !formState.userAgreementChecked
        });
    }, [formState.userAgreementChecked, updateFormState]);

    const disabled = formControlsDisabled || props.disabled;

    return (
        <AbstractCheckbox checked={formState.userAgreementChecked == true} onClick={onClick} disabled={disabled}>
            {i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.form.agreementCheckbox}
        </AbstractCheckbox>
    );
};
