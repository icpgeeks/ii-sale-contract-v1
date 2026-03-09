import {isNullish, nonNullish} from '@dfinity/utils';
import {useEffect} from 'react';
import {useCurrentCanisterIdContext} from '../canisterId/CurrentCanisterIdProvider';
import {useIdentityHolderContext} from '../identityHolder/IdentityHolderProvider';
import {useContractOwnerContext} from './ContractOwnerProvider';

export const ContractOwnerPreloader = () => {
    const {currentCanisterId} = useCurrentCanisterIdContext();
    const {holder, feature: holderFeature} = useIdentityHolderContext();
    const {fetchContractOwner} = useContractOwnerContext();

    useEffect(() => {
        if (isNullish(currentCanisterId)) {
            return;
        }
        // Wait until the holder has finished loading before deciding anything.
        if (!holderFeature.status.loaded) {
            return;
        }
        // Holder loaded successfully — owner is already embedded in holder data, no extra fetch needed.
        if (nonNullish(holder)) {
            return;
        }
        // Holder failed to load or is absent — fetch the contract owner separately
        // so the UI can still determine ownership (e.g. for settings page access).
        fetchContractOwner();
    }, [fetchContractOwner, currentCanisterId, holderFeature.status.loaded, holder]);

    return null;
};
