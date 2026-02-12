import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {IdentityHolderWaitingStartCaptureStateGuestPage} from './guest/IdentityHolderWaitingStartCaptureStateGuestPage';
import {IdentityHolderWaitingStartCaptureStatePage} from './owner/IdentityHolderWaitingStartCaptureStatePage';

export const IdentityHolderWaitingStartCaptureStateRootComponent = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContext();

    if (isOwnedByCurrentUser) {
        return <IdentityHolderWaitingStartCaptureStatePage />;
    }
    return <IdentityHolderWaitingStartCaptureStateGuestPage />;
};
