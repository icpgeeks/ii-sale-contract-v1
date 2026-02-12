import {isNullish} from '@dfinity/utils';
import {type DataAvailability, type ExtractDataAvailabilityStateByType} from 'frontend/src/utils/core/feature/feature';
import {useMemo} from 'react';
import {useCommonRequiredData, type CommonRequiredDataAvailability, type CommonRequiredDataFunctions} from '../../common/useCommonRequiredData';

type BuyerOfferCostContext =
    | {
          type: 'noOfferAmount';
      }
    | {
          type: 'canSetOffer';
          icrcLedgerFeeUlps: bigint;
          offerAmountUlps: bigint;
          totalCostUlps: bigint;
          offerIsGreaterOrEqualThanSalePrice: boolean;
      };

type CommonRequiredDataAvailable = ExtractDataAvailabilityStateByType<CommonRequiredDataAvailability, 'available'>;

type Available = CommonRequiredDataAvailable & {
    buyerOfferCostContext: BuyerOfferCostContext;
};

type RequiredDataAvailability = DataAvailability<Available>;

type Context = {
    requireDataAvailability: RequiredDataAvailability;
} & CommonRequiredDataFunctions;

export const useRequiredData = (offerAmountUlps: bigint | undefined): Context => {
    const {commonRequireDataAvailability, refetchICRCMetadataInProgress, refetchICRCMetadata} = useCommonRequiredData();

    /**
    ==========================================
    Required Data Availability
    ==========================================
    */

    const requireDataAvailability = useMemo<RequiredDataAvailability>(() => {
        if (commonRequireDataAvailability.type !== 'available') {
            return commonRequireDataAvailability;
        }
        if (isNullish(offerAmountUlps)) {
            return {...commonRequireDataAvailability, buyerOfferCostContext: {type: 'noOfferAmount'}};
        }

        const {salePriceUlps, icrcLedgerFeeUlps} = commonRequireDataAvailability;

        const totalCostUlps = offerAmountUlps + icrcLedgerFeeUlps;
        const offerIsGreaterOrEqualThanSalePrice = offerAmountUlps >= salePriceUlps;
        const buyerOfferCostContext: BuyerOfferCostContext = {
            type: 'canSetOffer',
            icrcLedgerFeeUlps,
            offerAmountUlps,
            totalCostUlps,
            offerIsGreaterOrEqualThanSalePrice
        };

        const requireDataAvailability: RequiredDataAvailability = {
            ...commonRequireDataAvailability,
            buyerOfferCostContext
        };
        return requireDataAvailability;
    }, [commonRequireDataAvailability, offerAmountUlps]);

    return useMemo<Context>(() => {
        return {
            requireDataAvailability,

            refetchICRCMetadataInProgress: refetchICRCMetadataInProgress,
            refetchICRCMetadata: refetchICRCMetadata
        };
    }, [requireDataAvailability, refetchICRCMetadata, refetchICRCMetadataInProgress]);
};
