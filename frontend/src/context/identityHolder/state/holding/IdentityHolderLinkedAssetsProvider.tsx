import {createContext, type PropsWithChildren, useContext, useMemo} from 'react';
import {useIdentityHolderLinkedAssetsValue} from './useIdentityHolderLinkedAssetsValue';

type Context = ReturnType<typeof useIdentityHolderLinkedAssetsValue>;
const Context = createContext<Context | undefined>(undefined);
export const useIdentityHolderLinkedAssetsContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityHolderLinkedAssetsContext must be used within a IdentityHolderLinkedAssetsProvider');
    }
    return context;
};

export const IdentityHolderLinkedAssetsProvider = (props: PropsWithChildren) => {
    const linkedAssets = useIdentityHolderLinkedAssetsValue();
    const value: Context = useMemo<Context>(() => linkedAssets, [linkedAssets]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
