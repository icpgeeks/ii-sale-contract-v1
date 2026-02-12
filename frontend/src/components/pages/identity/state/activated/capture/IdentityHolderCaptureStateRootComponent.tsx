import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {IdentityHolderCaptureStateGuestPage} from './guest/IdentityHolderCaptureStateGuestPage';
import {IdentityHolderCaptureStateRenderer} from './owner/IdentityHolderCaptureStateRenderer';

export const IdentityHolderCaptureStateRootComponent = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    if (isOwnedByCurrentUser) {
        return <IdentityHolderCaptureStateRenderer />;
    }
    return <IdentityHolderCaptureStateGuestPage />;
};
