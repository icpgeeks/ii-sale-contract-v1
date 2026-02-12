import {NeedDeleteProtectedIdentityAuthnMethodDataProvider} from './NeedDeleteProtectedIdentityAuthnMethodDataProvider';
import {NeedDeleteProtectedIdentityAuthnMethodPanel} from './NeedDeleteProtectedIdentityAuthnMethodPanel';

export const NeedDeleteProtectedIdentityAuthnMethodPage = () => {
    return (
        <NeedDeleteProtectedIdentityAuthnMethodDataProvider>
            <NeedDeleteProtectedIdentityAuthnMethodPanel />
        </NeedDeleteProtectedIdentityAuthnMethodDataProvider>
    );
};
