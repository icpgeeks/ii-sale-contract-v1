import type {Principal} from '@dfinity/principal';
import {fromNullishNullable, isNullish, nonNullish} from '@dfinity/utils';
import type {HolderInformation, HolderProcessingError, HolderState, QueryCanisterSignedRequest, SaleDeal, Timestamped_5} from 'src/declarations/contract/contract.did';
import {sortArrayByValues} from '../../utils/core/array/array';
import {hasProperty} from '../../utils/core/typescript/typescriptAddons';

export const getHolderProcessingError = (processingError: HolderInformation['processing_error'] | undefined): HolderProcessingError | undefined => {
    return fromNullishNullable(processingError)?.value;
};

export const hasHolderProcessingError = (processingError: HolderInformation['processing_error'] | undefined): boolean => {
    return nonNullish(getHolderProcessingError(processingError));
};

export const getHoldingFetchingAssetsObtainDelegationStateGetDelegationWaitingSignedRequest = (holderState: HolderState | undefined): QueryCanisterSignedRequest | undefined => {
    if (isNullish(holderState)) {
        return undefined;
    }
    if (!hasProperty(holderState, 'Holding')) {
        return undefined;
    }
    const holdingSubState = holderState.Holding.sub_state;
    if (!hasProperty(holdingSubState, 'FetchAssets')) {
        return undefined;
    }
    const fetchAssetsState = holdingSubState.FetchAssets.fetch_assets_state;
    if (!hasProperty(fetchAssetsState, 'ObtainDelegationState')) {
        return undefined;
    }
    const obtainDelegationSubState = fetchAssetsState.ObtainDelegationState.sub_state;
    if (!hasProperty(obtainDelegationSubState, 'GetDelegationWaiting')) {
        return undefined;
    }
    return obtainDelegationSubState.GetDelegationWaiting.get_delegation_request;
};

export type BuyerOfferTimestamped = Timestamped_5;

export const findBuyerOffer = (saleDeal: SaleDeal | undefined, buyer: Principal | undefined): BuyerOfferTimestamped | undefined => {
    if (isNullish(saleDeal) || isNullish(buyer)) {
        return undefined;
    }
    return saleDeal.offers.find((offer) => buyer.compareTo(offer.value.buyer) == 'eq');
};

export const getSortedBuyerOffersByOfferAmountAndTime = (offers: Array<BuyerOfferTimestamped> | undefined): Array<BuyerOfferTimestamped> => {
    /**
     * largest offer amount first, then by timestamp (oldest first)
     */
    return sortArrayByValues(
        offers ?? [],
        (item) => -item.value.offer_amount,
        (item) => item.timestamp
    );
};
