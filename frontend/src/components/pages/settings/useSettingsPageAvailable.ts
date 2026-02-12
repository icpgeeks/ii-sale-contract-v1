import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';

import {useMemo} from 'react';

export const useSettingsPageAvailable = () => {
    const {isAuthenticated} = useAuthContext();
    const {isOwnedByCurrentUser} = useIdentityHolderContext();

    return useMemo<boolean>(() => {
        if (!isAuthenticated) {
            return false;
        }
        if (!isOwnedByCurrentUser) {
            return false;
        }
        return true;
    }, [isAuthenticated, isOwnedByCurrentUser]);
};
