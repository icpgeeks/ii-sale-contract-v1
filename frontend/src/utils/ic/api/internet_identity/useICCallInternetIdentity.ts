import {useCanisterContext} from 'frontend/src/context/canister/CanisterProvider';
import {useCallback, useMemo} from 'react';
import {INTERNET_IDENTITY_CANISTER_ID_TEXT} from '../../constants';

export const useInternetIdentityAnonymousCanisterFactory = () => {
    const {getInternetIdentityAnonymousCanister} = useCanisterContext();

    const getActor = useCallback(() => {
        return getInternetIdentityAnonymousCanister(INTERNET_IDENTITY_CANISTER_ID_TEXT);
    }, [getInternetIdentityAnonymousCanister]);
    return useMemo(() => ({getActor}), [getActor]);
};
