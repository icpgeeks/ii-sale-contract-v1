import {createContext, type PropsWithChildren, useContext, useMemo} from 'react';
import type {BuyerOfferTimestamped} from '../../identityHolderUtils';
import {useIdentityHolderSortedOffers} from './useIdentityHolderSortedOffers';

type Context = {
    offers: Array<BuyerOfferTimestamped> | undefined;
    numberOfOffers: number;
};
const Context = createContext<Context | undefined>(undefined);
export const useIdentityHolderOffersContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityHolderOffersContext must be used within a IdentityHolderOffersProvider');
    }
    return context;
};

export const IdentityHolderOffersProvider = (props: PropsWithChildren) => {
    const offers = useIdentityHolderSortedOffers();
    const value: Context = useMemo<Context>(() => {
        return {
            offers,
            numberOfOffers: offers?.length ?? 0
        };
    }, [offers]);
    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
