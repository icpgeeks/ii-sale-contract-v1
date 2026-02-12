import {TextAreaReadonlyFormItemRow} from 'frontend/src/components/widgets/form/textareaFormItem/TextAreaReadonlyFormItemRow';
import {useNeedConfirmAuthnMethodSessionRegistrationDataContext} from '../NeedConfirmAuthnMethodSessionRegistrationDataProvider';

export const ConfirmationCode = (props: {disabled?: boolean}) => {
    const {confirmationCode, formControlsDisabled} = useNeedConfirmAuthnMethodSessionRegistrationDataContext();
    return <TextAreaReadonlyFormItemRow value={confirmationCode} size="large" disabled={props.disabled || formControlsDisabled} />;
};
