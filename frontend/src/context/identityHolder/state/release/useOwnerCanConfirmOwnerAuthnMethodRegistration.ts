import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {useMemo} from 'react';

export const useOwnerCanConfirmOwnerAuthnMethodRegistration = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const {getStateUnion} = useIdentityHolderStateContext();
    const releaseStateUnion = useMemo(() => getStateUnion('Release'), [getStateUnion]);

    return useMemo<boolean>(() => {
        if (!isOwnedByCurrentUser) {
            return false;
        }
        return releaseStateUnion?.type == 'WaitingAuthnMethodRegistration';
    }, [isOwnedByCurrentUser, releaseStateUnion?.type]);
};
