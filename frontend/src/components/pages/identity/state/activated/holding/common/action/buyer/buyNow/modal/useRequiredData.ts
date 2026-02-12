import {type DataAvailability, type ExtractDataAvailabilityStateByType} from 'frontend/src/utils/core/feature/feature';
import {useMemo} from 'react';
import {useCommonRequiredData, type CommonRequiredDataAvailability, type CommonRequiredDataFunctions} from '../../common/useCommonRequiredData';

type CommonRequiredDataAvailable = ExtractDataAvailabilityStateByType<CommonRequiredDataAvailability, 'available'>;

type Available = CommonRequiredDataAvailable & {totalCostUlps: bigint};

type RequiredDataAvailability = DataAvailability<Available>;

type Context = {
    requireDataAvailability: RequiredDataAvailability;
} & CommonRequiredDataFunctions;

export const useRequiredData = (): Context => {
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

        const {salePriceUlps, icrcLedgerFeeUlps} = commonRequireDataAvailability;
        const totalCostUlps = salePriceUlps + icrcLedgerFeeUlps;

        const requireDataAvailability: RequiredDataAvailability = {
            ...commonRequireDataAvailability,
            totalCostUlps
        };
        return requireDataAvailability;
    }, [commonRequireDataAvailability]);

    return useMemo<Context>(() => {
        return {
            requireDataAvailability,

            refetchICRCMetadataInProgress: refetchICRCMetadataInProgress,
            refetchICRCMetadata: refetchICRCMetadata
        };
    }, [requireDataAvailability, refetchICRCMetadata, refetchICRCMetadataInProgress]);
};
