import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {useWaitingAuthnMethodRegistrationDataContext} from '../WaitingAuthnMethodRegistrationDataProvider';

export const ConfirmOwnerAuthnMethodRegistrationButton = () => {
    const {buttonProps} = useWaitingAuthnMethodRegistrationDataContext();
    return <PrimaryButton {...buttonProps} />;
};
