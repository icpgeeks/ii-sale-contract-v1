import {fromNullable, fromNullishNullable, isNullish, nonNullish} from '@dfinity/utils';
import {useICCanisterCallContractAnonymous} from 'frontend/src/api/contract/useICCallContract';
import {HOLDER_LOCKED_CLIENT_DELAY_MILLIS} from 'frontend/src/constants';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {toError} from 'frontend/src/utils/core/error/toError';
import {type Feature, type FeaturePartial} from 'frontend/src/utils/core/feature/feature';
import {extractValidPositiveInteger} from 'frontend/src/utils/core/number/transform';
import {delayPromise} from 'frontend/src/utils/core/promise/promiseUtils';
import {reusePromiseWrapper} from 'frontend/src/utils/core/promise/reusePromise';
import {getICFirstKey} from 'frontend/src/utils/ic/did';
import {useCallback, useMemo, useState, type Dispatch} from 'react';
import type {CompletedSaleDeal, HolderInformation} from 'src/declarations/contract/contract.did';
import {apiLogger, applicationLogger} from '../logger/logger';
import {holderLockedMessage} from '../logger/loggerConstants';
import {hasHolderProcessingError} from './identityHolderUtils';

/**
 * Possible processing states for a Holder:
 * - undefined: the data has not been loaded yet
 * - 'holderLockedForProcessing': the object is currently locked on the server for processing
 * - 'processingScheduled/scheduledProcessingTimeMillis':
 *     processing is complete, client can interact with the object,
 *     but should poll the server again after the specified delay
 */
type HolderProcessingRemoteState = {type: 'holderLockedForProcessing'} | {type: 'processingScheduled'; scheduledProcessingTimeMillis: number};

type Context = {
    holder: HolderInformation | undefined;
    setHolder: (holder: HolderInformation | undefined) => void;

    feature: Feature;
    updateHolderFeature: Dispatch<FeaturePartial>;

    fetchHolder: () => Promise<void>;

    identityNumber: number | undefined;
    identityName: string | undefined;

    isOwnedByCurrentUser: boolean;
    isPotentialLoggedInBuyer: boolean;

    holderProcessingRemoteState: HolderProcessingRemoteState | undefined;
    holderIsLockedForProcessing: boolean;
    isScheduledRemoteProcessingExpired: boolean;

    completedSaleDeal: CompletedSaleDeal | undefined;
    hasCompletedSaleDeal: boolean;
    isCompletedSaleDealSeller: boolean;
    isCompletedSaleDealBuyer: boolean;

    hasProcessingError: boolean;
};

export const useIdentityHolder = (): Context => {
    const {principal, isCurrentLoggedInPrincipal} = useAuthContext();

    const [holder, setHolderRaw] = useState<HolderInformation | undefined>(undefined);

    const setHolder = useCallback(
        (holder: HolderInformation | undefined) => {
            setHolderRaw((prevHolder: HolderInformation | undefined) => {
                const newUpdateVersion = holder?.update_version;
                const prevUpdateVersion = prevHolder?.update_version;
                if (nonNullish(newUpdateVersion) && nonNullish(prevUpdateVersion)) {
                    if (newUpdateVersion < prevUpdateVersion) {
                        applicationLogger.warn(`useIdentityHolder.setHolder: update with outdated version`, {
                            newUpdateVersion,
                            prevUpdateVersion,
                            holder,
                            prevHolder
                        });
                    }
                }
                return holder;
            });
        },
        [setHolderRaw]
    );

    const {call, feature, updateFeature} = useICCanisterCallContractAnonymous('getHolderInformation');

    const fetchHolder = useMemo(
        () =>
            reusePromiseWrapper(async () => {
                const logMessagePrefix = `getHolderInformation:`;
                await call([], {
                    logger: apiLogger,
                    logMessagePrefix,
                    onResponseOkBeforeExit: async (responseOk) => {
                        setHolder(responseOk.holder_information);
                    },
                    onResponseErrorBeforeExit: async (responseError) => {
                        throw toError(getICFirstKey(responseError));
                    }
                });
            }),
        [call, setHolder]
    );

    const identityNumber = useMemo(() => {
        const identityNumber = fromNullishNullable(holder?.identity_number);
        if (isNullish(identityNumber)) {
            return undefined;
        }
        return Number(identityNumber);
    }, [holder?.identity_number]);

    const identityName = useMemo(() => {
        const identityName = fromNullishNullable(holder?.identity_name);
        if (isNullish(identityName)) {
            return undefined;
        }
        return identityName;
    }, [holder?.identity_name]);

    const isOwnedByCurrentUser: boolean = useMemo(() => {
        if (isNullish(principal) || principal.isAnonymous()) {
            return false;
        }
        const owner = fromNullishNullable(holder?.owner);
        if (isNullish(owner)) {
            return false;
        }
        applicationLogger.debug('useIdentityHolder: isOwnedByCurrentUser check', {principal: principal.toText(), owner: owner.toText()});
        return principal.compareTo(owner) == 'eq';
    }, [principal, holder?.owner]);

    const isPotentialLoggedInBuyer: boolean = useMemo(() => {
        if (isNullish(principal) || principal.isAnonymous()) {
            return false;
        }
        const owner = fromNullishNullable(holder?.owner);
        if (isNullish(owner)) {
            return false;
        }
        return principal.compareTo(owner) != 'eq';
    }, [principal, holder?.owner]);

    const holderProcessingState: HolderProcessingRemoteState | undefined = useMemo(() => {
        if (isNullish(holder?.schedule_processing)) {
            return undefined;
        }
        const schedule_processing = fromNullable(holder.schedule_processing);
        if (isNullish(schedule_processing)) {
            return {type: 'holderLockedForProcessing'};
        }
        const scheduledProcessingTimeMillis = extractValidPositiveInteger(Number(schedule_processing.time));
        if (isNullish(scheduledProcessingTimeMillis)) {
            return {type: 'holderLockedForProcessing'};
        }
        return {type: 'processingScheduled', scheduledProcessingTimeMillis};
    }, [holder?.schedule_processing]);

    const holderIsLockedForProcessing: boolean = useMemo(() => {
        return holderProcessingState?.type == 'holderLockedForProcessing';
    }, [holderProcessingState]);

    const isScheduledRemoteProcessingExpired: boolean = useMemo(() => {
        if (holderProcessingState?.type == 'processingScheduled') {
            // eslint-disable-next-line react-hooks/purity
            return holderProcessingState.scheduledProcessingTimeMillis < Date.now();
        }
        return false;
    }, [holderProcessingState]);

    const hasProcessingError = useMemo(() => hasHolderProcessingError(holder?.processing_error), [holder?.processing_error]);

    const completedSaleDeal = useMemo<CompletedSaleDeal | undefined>(() => fromNullishNullable(holder?.completed_sale_deal), [holder?.completed_sale_deal]);
    const hasCompletedSaleDeal = useMemo<boolean>(() => nonNullish(completedSaleDeal), [completedSaleDeal]);
    const [isCompletedSaleDealSeller, isCompletedSaleDealBuyer] = useMemo(
        () => [isCurrentLoggedInPrincipal(completedSaleDeal?.seller), isCurrentLoggedInPrincipal(completedSaleDeal?.buyer)],
        [completedSaleDeal?.seller, completedSaleDeal?.buyer, isCurrentLoggedInPrincipal]
    );

    return useMemo<Context>(
        () => ({
            holder,
            setHolder,

            feature,
            updateHolderFeature: updateFeature,

            fetchHolder,

            identityNumber,
            identityName,
            isOwnedByCurrentUser,
            isPotentialLoggedInBuyer,

            holderProcessingRemoteState: holderProcessingState,
            holderIsLockedForProcessing,
            isScheduledRemoteProcessingExpired,

            completedSaleDeal,
            hasCompletedSaleDeal,
            isCompletedSaleDealSeller,
            isCompletedSaleDealBuyer,

            hasProcessingError
        }),
        [
            holder,
            setHolder,
            feature,
            updateFeature,
            fetchHolder,
            identityNumber,
            identityName,
            isOwnedByCurrentUser,
            isPotentialLoggedInBuyer,
            holderProcessingState,
            holderIsLockedForProcessing,
            isScheduledRemoteProcessingExpired,
            completedSaleDeal,
            hasCompletedSaleDeal,
            isCompletedSaleDealSeller,
            isCompletedSaleDealBuyer,
            hasProcessingError
        ]
    );
};

export const sleepOnHolderLockedForProcessing = async (holderIsLockedForProcessing: boolean, logMessagePrefix: string): Promise<void> => {
    if (holderIsLockedForProcessing) {
        apiLogger.debug(holderLockedMessage(logMessagePrefix));
        await delayPromise(HOLDER_LOCKED_CLIENT_DELAY_MILLIS);
    }
};
