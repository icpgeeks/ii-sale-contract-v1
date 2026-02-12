import {NeedConfirmAuthnMethodSessionRegistrationDataProvider} from './NeedConfirmAuthnMethodSessionRegistrationDataProvider';
import {NeedConfirmAuthnMethodSessionRegistrationFormDataProvider} from './NeedConfirmAuthnMethodSessionRegistrationFormDataProvider';
import {NeedConfirmAuthnMethodSessionRegistrationPanel} from './NeedConfirmAuthnMethodSessionRegistrationPanel';

export const NeedConfirmAuthnMethodSessionRegistrationPage = () => {
    return (
        <NeedConfirmAuthnMethodSessionRegistrationFormDataProvider>
            <NeedConfirmAuthnMethodSessionRegistrationDataProvider>
                <NeedConfirmAuthnMethodSessionRegistrationPanel />
            </NeedConfirmAuthnMethodSessionRegistrationDataProvider>
        </NeedConfirmAuthnMethodSessionRegistrationFormDataProvider>
    );
};
