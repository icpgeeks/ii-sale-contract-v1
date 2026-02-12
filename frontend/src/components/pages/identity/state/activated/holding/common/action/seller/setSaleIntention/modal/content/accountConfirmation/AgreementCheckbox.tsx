import {AbstractCheckbox} from 'frontend/src/components/widgets/form/AbstractCheckbox';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {useSetSaleIntentionModalDataContext} from '../../SetSaleIntentionModalDataProvider';
import {useSetSaleIntentionModalFormDataContext} from '../../SetSaleIntentionModalFormDataProvider';

export const AgreementCheckbox = () => {
    const {formState, updateFormState} = useSetSaleIntentionModalFormDataContext();
    const {formControlsDisabled} = useSetSaleIntentionModalDataContext();

    const onClick = useCallback(() => {
        updateFormState({
            userAgreementChecked: !formState.userAgreementChecked
        });
    }, [formState.userAgreementChecked, updateFormState]);

    return (
        <AbstractCheckbox checked={formState.userAgreementChecked == true} onClick={onClick} disabled={formControlsDisabled}>
            {i18.holder.state.holding.modal.setSaleIntention.confirm.agreementCheckbox}
        </AbstractCheckbox>
    );
};
