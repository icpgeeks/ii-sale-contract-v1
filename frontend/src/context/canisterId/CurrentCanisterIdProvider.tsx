import {isNullish} from '@dfinity/utils';
import type {WithoutUndefined} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {createContext, useContext, useEffect, useMemo, type PropsWithChildren} from 'react';
import {useContractCanisterId} from './useContractCanisterId';

type Context = ReturnType<typeof useContractCanisterId>;
type SafeContext = WithoutUndefined<Context>;

const Context = createContext<Context | undefined>(undefined);
export const useCurrentCanisterIdContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useCurrentCanisterIdContextUnsafe must be used within a CurrentCanisterIdProvider');
    }
    return context;
};

export const useCurrentCanisterIdContextSafe = (): SafeContext => {
    const context = useContext<Context | undefined>(Context);
    if (isNullish(context)) {
        throw new Error('useCurrentCanisterIdContextSafe must be used within a CurrentCanisterIdProvider');
    }
    if (isNullish(context.currentCanister)) {
        throw new Error('useCurrentCanisterIdContextSafe: currentCanister is nullish');
    }
    if (isNullish(context.currentCanisterId)) {
        throw new Error('useCurrentCanisterIdContextSafe: currentCanisterId is nullish');
    }
    return context as SafeContext;
};

export const CurrentCanisterIdProvider = (props: PropsWithChildren) => {
    const currentCanisterId = useContractCanisterId();
    const {fetchCurrentCanisterId} = currentCanisterId;

    useEffect(() => {
        fetchCurrentCanisterId();
    }, [fetchCurrentCanisterId]);

    const value: Context = useMemo(() => currentCanisterId, [currentCanisterId]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
