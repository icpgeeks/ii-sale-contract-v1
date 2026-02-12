import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {useMemo} from 'react';

export const useOwnerCanDeleteHolderAuthnMethod = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const {getStateUnion} = useIdentityHolderStateContext();
    const releaseStateUnion = useMemo(() => getStateUnion('Release'), [getStateUnion]);

    return useMemo<boolean>(() => {
        if (!isOwnedByCurrentUser) {
            return false;
        }
        return releaseStateUnion?.type == 'CheckingAccessFromOwnerAuthnMethod' || releaseStateUnion?.type == 'DangerousToLoseIdentity' || releaseStateUnion?.type == 'IdentityAPIChanged';
    }, [isOwnedByCurrentUser, releaseStateUnion?.type]);
};
