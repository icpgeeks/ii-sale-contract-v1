import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {useAuthnMethodRegistrationModeEnterInvalidRegistrationIdDataContext} from '../AuthnMethodRegistrationModeEnterInvalidRegistrationIdDataProvider';

export const OkButton = () => {
    const {buttonProps} = useAuthnMethodRegistrationModeEnterInvalidRegistrationIdDataContext();
    return <PrimaryButton {...buttonProps} />;
};
