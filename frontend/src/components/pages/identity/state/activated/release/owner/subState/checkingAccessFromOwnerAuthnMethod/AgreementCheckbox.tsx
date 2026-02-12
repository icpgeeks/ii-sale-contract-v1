import {AbstractCheckbox} from 'frontend/src/components/widgets/form/AbstractCheckbox';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {useCheckingAccessFromOwnerAuthnMethodDataContext} from './CheckingAccessFromOwnerAuthnMethodDataProvider';
import {useCheckingAccessFromOwnerAuthnMethodFormDataContext} from './CheckingAccessFromOwnerAuthnMethodFormDataProvider';

export const AgreementCheckbox = (props: {disabled?: boolean}) => {
    const {formState, updateFormState} = useCheckingAccessFromOwnerAuthnMethodFormDataContext();
    const {actionInProgress} = useCheckingAccessFromOwnerAuthnMethodDataContext();

    const formControlsDisabled = actionInProgress;

    const onClick = useCallback(() => {
        updateFormState({
            userAgreementChecked: !formState.userAgreementChecked
        });
    }, [formState.userAgreementChecked, updateFormState]);

    const disabled = formControlsDisabled || props.disabled;

    return (
        <AbstractCheckbox checked={formState.userAgreementChecked == true} onClick={onClick} disabled={disabled}>
            {i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.form.agreementCheckbox}
        </AbstractCheckbox>
    );
};
