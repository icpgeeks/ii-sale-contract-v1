import {fromNullishNullable, nonNullish} from '@dfinity/utils';
import {createContext, type PropsWithChildren, useContext, useMemo} from 'react';
import type {HolderAssets} from 'src/declarations/contract/contract.did';
import {useIdentityHolderContext} from '../../IdentityHolderProvider';

type Context = {
    assets: HolderAssets | undefined;
    hasAssets: boolean;
    fetchingAssets: HolderAssets | undefined;
    hasFetchingAssets: boolean;
};

const Context = createContext<Context | undefined>(undefined);
export const useIdentityHolderAssetsContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityHolderAssetsContextUnsafe must be used within a IdentityHolderAssetsProvider');
    }
    return context;
};

export const IdentityHolderAssetsProvider = (props: PropsWithChildren) => {
    const {holder} = useIdentityHolderContext();
    const value: Context = useMemo<Context>(() => {
        const assets = fromNullishNullable(holder?.assets)?.value;
        const fetchingAssets = fromNullishNullable(holder?.fetching_assets);
        return {
            assets,
            hasAssets: nonNullish(assets),

            fetchingAssets,
            hasFetchingAssets: nonNullish(fetchingAssets)
        };
    }, [holder]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
