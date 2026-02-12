import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {useMemo} from 'react';

export const useOwnerCanConfirmHolderAuthnMethodRegistration = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const {getStateUnion} = useIdentityHolderStateContext();
    const captureStateUnion = useMemo(() => getStateUnion('Capture'), [getStateUnion]);

    return useMemo<boolean>(() => {
        if (!isOwnedByCurrentUser) {
            return false;
        }
        return captureStateUnion?.type == 'NeedConfirmAuthnMethodSessionRegistration';
    }, [isOwnedByCurrentUser, captureStateUnion?.type]);
};
