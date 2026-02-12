import type {Principal} from '@dfinity/principal';
import {isNullish} from '@dfinity/utils';
import {useMemo} from 'react';
import {type BuyerOfferTimestamped, findBuyerOffer} from '../../identityHolderUtils';
import {useIdentityHolderSaleStatus} from './useIdentityHolderSaleStatus';

type Status =
    | {type: 'saleIntentionNotSet'}
    | {type: 'buyerOfferNotSet'}
    | {
          type: 'buyerOffer';
          buyerOffer: BuyerOfferTimestamped;
      };

type Context = {
    status: Status;
};

export const useIdentityHolderBuyerOffer = (buyer: Principal | undefined): Context => {
    const saleStatus = useIdentityHolderSaleStatus();

    const status = useMemo<Status>(() => {
        if (saleStatus.type == 'noData' || saleStatus.type == 'saleIntentionNotSet') {
            return {type: 'saleIntentionNotSet'};
        }
        const buyerOffer = findBuyerOffer(saleStatus.saleDeal, buyer);
        if (isNullish(buyerOffer)) {
            return {type: 'buyerOfferNotSet'};
        }

        return {
            type: 'buyerOffer',
            buyerOffer
        };
    }, [saleStatus, buyer]);

    return useMemo<Context>(() => ({status}), [status]);
};
