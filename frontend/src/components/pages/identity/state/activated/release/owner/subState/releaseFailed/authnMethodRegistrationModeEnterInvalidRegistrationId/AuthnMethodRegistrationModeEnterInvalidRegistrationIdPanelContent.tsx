import {RestartReleaseIdentityDataProvider} from '../../../common/restartReleaseIdentity/RestartReleaseIdentityDataProvider';
import {AuthnMethodRegistrationModeEnterInvalidRegistrationIdDataProvider} from './AuthnMethodRegistrationModeEnterInvalidRegistrationIdDataProvider';
import {AuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataProvider} from './AuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataProvider';
import {AuthnMethodRegistrationModeEnterInvalidRegistrationIdPanel} from './AuthnMethodRegistrationModeEnterInvalidRegistrationIdPanel';

export const AuthnMethodRegistrationModeEnterInvalidRegistrationIdPanelContent = () => {
    return (
        <AuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataProvider>
            <RestartReleaseIdentityDataProvider>
                <AuthnMethodRegistrationModeEnterInvalidRegistrationIdDataProvider>
                    <AuthnMethodRegistrationModeEnterInvalidRegistrationIdPanel />
                </AuthnMethodRegistrationModeEnterInvalidRegistrationIdDataProvider>
            </RestartReleaseIdentityDataProvider>
        </AuthnMethodRegistrationModeEnterInvalidRegistrationIdFormDataProvider>
    );
};
