import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {useNeedConfirmAuthnMethodSessionRegistrationDataContext} from '../NeedConfirmAuthnMethodSessionRegistrationDataProvider';

export const ConfirmHolderAuthnMethodRegistrationButton = () => {
    const {buttonProps} = useNeedConfirmAuthnMethodSessionRegistrationDataContext();
    return <PrimaryButton {...buttonProps} />;
};
