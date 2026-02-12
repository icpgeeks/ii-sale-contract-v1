import type {IcrcAccount} from '@dfinity/ledger-icrc';
import {isNullish, principalToSubAccount} from '@dfinity/utils';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useCurrentCanisterIdContextSafe} from 'frontend/src/context/canisterId/CurrentCanisterIdProvider';
import {useBuyerCanSetOffer} from 'frontend/src/context/identityHolder/state/holding/useBuyerCanSetOffer';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {useRefetchIdentityHolder} from 'frontend/src/context/identityHolder/useRefetchIdentityHolder';
import {useICRCMetadata} from 'frontend/src/context/ledger/icrc/useICRCMetadata';
import {type DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {MAINNET_LEDGER_CANISTER_ID} from 'frontend/src/utils/ic/constants';
import {useCallback, useEffect, useMemo} from 'react';

type Available = {
    icrcLedgerFeeUlps: bigint;

    salePriceUlps: bigint;
    saleWillExpireAtMillis: bigint;

    icrcSpender: IcrcAccount;
};
export type CommonRequiredDataAvailability = DataAvailability<Available>;

export type CommonRequiredDataFunctions = {
    refetchICRCMetadataInProgress: boolean;
    refetchICRCMetadata: () => Promise<void>;
};
type Context = {
    commonRequireDataAvailability: CommonRequiredDataAvailability;
} & CommonRequiredDataFunctions;

export const useCommonRequiredData = (): Context => {
    const {principal} = useAuthContext();
    const identityHolderLoaded = useRefetchIdentityHolder();
    const buyerCanSetOffer = useBuyerCanSetOffer();

    /**
    ==========================================
    ICRC Metadata
    ==========================================
    */

    const {fetchMetadata, metadataDataAvailability, metadataFeature} = useICRCMetadata(MAINNET_LEDGER_CANISTER_ID);

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    /**
    ==========================================
    ICRC Spender
    ==========================================
    */

    const {currentCanister} = useCurrentCanisterIdContextSafe();
    const icrcSpender = useMemo<IcrcAccount | undefined>(() => {
        if (isNullish(principal)) {
            return undefined;
        }
        return {owner: currentCanister, subaccount: principalToSubAccount(principal)};
    }, [currentCanister, principal]);

    /**
    ==========================================
    Sale Deal
    ==========================================
    */

    const saleStatus = useIdentityHolderSaleStatus();
    const salePriceUlps = saleStatus.type == 'listed' ? saleStatus.price : undefined;
    const saleWillExpireAtMillis = saleStatus.type == 'listed' ? saleStatus.saleWillExpireAtMillis : undefined;

    /**
    ==========================================
    Refetch Required Data
    ==========================================
    */

    const refetchICRCMetadataInProgress = metadataFeature.status.inProgress;
    const refetchICRCMetadata = useCallback(async () => {
        await fetchMetadata();
    }, [fetchMetadata]);

    /**
    ==========================================
    Required Data Availability
    ==========================================
    */

    const requireDataAvailability = useMemo<CommonRequiredDataAvailability>(() => {
        if (!identityHolderLoaded || metadataDataAvailability.type == 'loading') {
            return {type: 'loading'};
        }

        if (!buyerCanSetOffer || isNullish(salePriceUlps) || isNullish(saleWillExpireAtMillis) || isNullish(icrcSpender) || metadataDataAvailability.type == 'notAvailable') {
            return {type: 'notAvailable'};
        }

        const icrcLedgerFeeUlps = metadataDataAvailability.metadata.fee;

        return {
            type: 'available',
            icrcLedgerFeeUlps,

            salePriceUlps,
            saleWillExpireAtMillis,

            icrcSpender
        };
    }, [identityHolderLoaded, metadataDataAvailability, buyerCanSetOffer, salePriceUlps, saleWillExpireAtMillis, icrcSpender]);

    return useMemo<Context>(() => {
        return {
            commonRequireDataAvailability: requireDataAvailability,

            refetchICRCMetadataInProgress,
            refetchICRCMetadata
        };
    }, [requireDataAvailability, refetchICRCMetadata, refetchICRCMetadataInProgress]);
};
