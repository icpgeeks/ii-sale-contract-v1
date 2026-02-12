import {isNullish} from '@dfinity/utils';
import {createContext, type PropsWithChildren, useContext, useMemo} from 'react';
import type {WithoutUndefined} from '../../utils/core/typescript/typescriptAddons';
import {useIdentityHolder} from './useIdentityHolder';

type Context = ReturnType<typeof useIdentityHolder>;

const Context = createContext<Context | undefined>(undefined);
export const useIdentityHolderContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityHolderContextSafe must be used within a IdentityHolderProvider');
    }
    return context;
};

export const useIdentityHolderContextSafe = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityHolderContextSafe must be used within a IdentityHolderProvider');
    }
    if (isNullish(context.holder)) {
        throw new Error('useIdentityHolderContextSafe: holder is nullish');
    }
    if (isNullish(context.identityNumber)) {
        throw new Error('useIdentityHolderContextSafe: identityNumber is nullish');
    }
    return context as WithoutUndefined<Context, 'holder' | 'identityNumber'>;
};

export const IdentityHolderProvider = (props: PropsWithChildren) => {
    const identityHolder = useIdentityHolder();
    const value: Context = useMemo<Context>(() => identityHolder, [identityHolder]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
