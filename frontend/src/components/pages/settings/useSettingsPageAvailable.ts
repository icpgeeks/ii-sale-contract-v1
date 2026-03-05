import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useContractOwnerContext} from 'frontend/src/context/contract/ContractOwnerProvider';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import type {DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {useMemo} from 'react';

type SettingsAvailability = DataAvailability<{areSettingsAvailable: boolean}>;

export const useSettingsPageAvailable = (): SettingsAvailability => {
    const {isAuthenticated} = useAuthContext();
    const {holder, feature: holderFeature, isOwnedByCurrentUser: isHolderOwnedByCurrentUser} = useIdentityHolderContext();
    const {isOwnedByCurrentUser: isContractOwnedByCurrentUser, feature: ownerFeature} = useContractOwnerContext();

    return useMemo<SettingsAvailability>(() => {
        if (!isAuthenticated) {
            return {type: 'available', areSettingsAvailable: false};
        }
        // Holder is still loading — wait before making a decision.
        if (!holderFeature.status.loaded) {
            return {type: 'loading'};
        }
        // If the holder is loaded, it contains the owner — use the pre-computed flag.
        if (holder != null) {
            return {type: 'available', areSettingsAvailable: isHolderOwnedByCurrentUser};
        }
        // Holder failed to load — wait for the contract owner to load separately.
        if (!ownerFeature.status.loaded) {
            return {type: 'loading'};
        }
        // Fall back to the contract owner fetched separately via ContractOwnerProvider
        // and check whether it matches the currently logged-in principal.
        return {type: 'available', areSettingsAvailable: isContractOwnedByCurrentUser};
    }, [isAuthenticated, holderFeature.status.loaded, holder, isHolderOwnedByCurrentUser, ownerFeature.status.loaded, isContractOwnedByCurrentUser]);
};
