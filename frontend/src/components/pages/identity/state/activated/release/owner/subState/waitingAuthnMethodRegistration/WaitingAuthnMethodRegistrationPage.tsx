import {WaitingAuthnMethodRegistrationDataProvider} from './WaitingAuthnMethodRegistrationDataProvider';
import {WaitingAuthnMethodRegistrationFormDataProvider} from './WaitingAuthnMethodRegistrationFormDataProvider';
import {WaitingAuthnMethodRegistrationPanel} from './WaitingAuthnMethodRegistrationPanel';

export const WaitingAuthnMethodRegistrationPage = () => {
    return (
        <WaitingAuthnMethodRegistrationFormDataProvider>
            <WaitingAuthnMethodRegistrationDataProvider>
                <WaitingAuthnMethodRegistrationPanel />
            </WaitingAuthnMethodRegistrationDataProvider>
        </WaitingAuthnMethodRegistrationFormDataProvider>
    );
};
