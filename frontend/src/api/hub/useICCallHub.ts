import {useCanisterContext} from 'frontend/src/context/canister/CanisterProvider';
import {useCallback, useMemo} from 'react';
import {useICCallTypedFor, type OnlyAsyncMethodNames} from '../../utils/ic/api/useICCallTypedFor';
import type {HubAnonymousCanister} from './HubCanister';

const useContractAnonymousCanisterFactory = (canisterId: string | undefined) => {
    const {getHubAnonymousCanister} = useCanisterContext();

    const getActor = useCallback(() => {
        return getHubAnonymousCanister(canisterId);
    }, [getHubAnonymousCanister, canisterId]);

    return useMemo(() => ({getActor}), [getActor]);
};

export const useICCanisterCallHubAnonymous = <K extends OnlyAsyncMethodNames<HubAnonymousCanister>>(canisterId: string | undefined, method: K) => {
    const {getActor} = useContractAnonymousCanisterFactory(canisterId);
    return useICCallTypedFor(getActor, method);
};
