import {TextareaFormItem} from 'frontend/src/components/widgets/form/textareaFormItem/TextareaFormItem';
import {i18} from 'frontend/src/i18';
import {useCallback} from 'react';
import {useIdentityHolderWaitingStartCaptureFormDataContext} from './IdentityHolderWaitingStartCaptureFormDataProvider';

export const PairURLInput = () => {
    const {formState, updateFormState, formValidationState} = useIdentityHolderWaitingStartCaptureFormDataContext();

    const setValue = useCallback(
        (value: string | undefined) => {
            updateFormState({pairURL: value});
        },
        [updateFormState]
    );

    return (
        <TextareaFormItem
            value={formState.pairURL}
            setValue={setValue}
            placeholder={i18.holder.state.capture.waitingStartCapture.form.pairUrl.placeholder}
            label={i18.holder.state.capture.waitingStartCapture.form.pairUrl.label}
            {...formValidationState.pairURL}
        />
    );
};
