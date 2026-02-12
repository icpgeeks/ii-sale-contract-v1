import {useCanisterContext} from 'frontend/src/context/canister/CanisterProvider';
import {useCurrentCanisterIdContext} from 'frontend/src/context/canisterId/CurrentCanisterIdProvider';
import {useCallback, useMemo} from 'react';
import {useICCallTypedFor, type OnlyAsyncMethodNames} from '../../utils/ic/api/useICCallTypedFor';
import type {ContractAnonymousCanister, ContractCanister} from './ContractCanister';

const useContractCanisterFactory = () => {
    const {currentCanisterId} = useCurrentCanisterIdContext();
    const {getContractCanister} = useCanisterContext();

    const getActor = useCallback(() => {
        return getContractCanister(currentCanisterId);
    }, [currentCanisterId, getContractCanister]);

    return useMemo(() => ({getActor}), [getActor]);
};

const useContractAnonymousCanisterFactory = () => {
    const {currentCanisterId} = useCurrentCanisterIdContext();
    const {getContractAnonymousCanister} = useCanisterContext();

    const getActor = useCallback(() => {
        return getContractAnonymousCanister(currentCanisterId);
    }, [currentCanisterId, getContractAnonymousCanister]);

    return useMemo(() => ({getActor}), [getActor]);
};

export const useICCanisterCallContract = <K extends OnlyAsyncMethodNames<ContractCanister>>(method: K) => {
    const {getActor} = useContractCanisterFactory();
    return useICCallTypedFor(getActor, method);
};

export const useICCanisterCallContractAnonymous = <K extends OnlyAsyncMethodNames<ContractAnonymousCanister>>(method: K) => {
    const {getActor} = useContractAnonymousCanisterFactory();
    return useICCallTypedFor(getActor, method);
};
