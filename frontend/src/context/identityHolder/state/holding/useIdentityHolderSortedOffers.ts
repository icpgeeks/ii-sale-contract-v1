import {fromNullable, isNullish, nonNullish} from '@dfinity/utils';
import {useMemo} from 'react';
import {useIdentityHolderContextSafe} from '../../IdentityHolderProvider';
import {type BuyerOfferTimestamped, getSortedBuyerOffersByOfferAmountAndTime} from '../../identityHolderUtils';

type Context = Array<BuyerOfferTimestamped> | undefined;

export const useIdentityHolderSortedOffers = () => {
    const {holder} = useIdentityHolderContextSafe();

    return useMemo<Context>(() => {
        const saleDeal = fromNullable(holder.sale_deal);
        if (isNullish(saleDeal)) {
            return undefined;
        }
        const offersWithAmount = saleDeal.offers.filter((v) => {
            const offerAmount = v.value.offer_amount;
            return nonNullish(offerAmount) && offerAmount > 0n;
        });
        return getSortedBuyerOffersByOfferAmountAndTime(offersWithAmount);
    }, [holder.sale_deal]);
};
