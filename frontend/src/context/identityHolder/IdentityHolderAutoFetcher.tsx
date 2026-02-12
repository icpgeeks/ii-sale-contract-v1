import {isNullish, nonNullish} from '@dfinity/utils';
import {getStepFromHoldingState} from 'frontend/src/components/pages/identity/state/activated/holding/subState/common/refetchValidateAssets/FetchValidateAssetsDataProvider';
import {memo, useEffect, useMemo} from 'react';
import {MILLIS_PER_SECOND} from '../../utils/core/date/constants';
import {getDurationTillUTCMillisUnsafe} from '../../utils/core/date/duration';
import {formatDuration} from '../../utils/core/date/format';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from '../../utils/core/promise/reusePromise';
import {getSafeTimerTimeout, getSafeTimerTimeoutTillUTCMillis} from '../../utils/core/timer/timer';
import {applicationLogger} from '../logger/logger';
import {exhaustiveCheckFailedMessage} from '../logger/loggerConstants';
import {useIdentityHolderProcessorContext} from './IdentityHolderProcessor';
import {useIdentityHolderContext} from './IdentityHolderProvider';
import {useIdentityHolderStateContext} from './state/IdentityHolderStateProvider';

const MIN_FETCH_INTERVAL_MILLIS = MILLIS_PER_SECOND * 3;
const DEFAULT_FETCH_INTERVAL_MILLIS = MILLIS_PER_SECOND * 5;

export const IdentityHolderAutoFetcher = memo(() => {
    const {feature, fetchHolder, holderProcessingRemoteState, isOwnedByCurrentUser} = useIdentityHolderContext();
    const identityHolderFetchInProgress = feature.status.inProgress;

    const {processInProgress: processingFromClientSideIsInProgress} = useIdentityHolderProcessorContext();

    const {stateUnion} = useIdentityHolderStateContext();

    const fetchIntervalForGuestDuringAssetsFetching = useMemo<number | undefined>(() => {
        if (isOwnedByCurrentUser || isNullish(stateUnion)) {
            return undefined;
        }
        switch (stateUnion.type) {
            case 'WaitingActivation': {
                return DEFAULT_FETCH_INTERVAL_MILLIS * 120;
            }
            case 'WaitingStartCapture': {
                return DEFAULT_FETCH_INTERVAL_MILLIS * 12;
            }
            case 'Capture': {
                return DEFAULT_FETCH_INTERVAL_MILLIS * 3;
            }
            case 'Holding': {
                const step = getStepFromHoldingState(stateUnion.state.sub_state, undefined);
                if (step.type != 'n/a') {
                    return DEFAULT_FETCH_INTERVAL_MILLIS * 3;
                }
                return undefined;
            }
            case 'Release':
            case 'Closed': {
                return undefined;
            }
            default: {
                const exhaustiveCheck: never = stateUnion;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                return undefined;
            }
        }
    }, [isOwnedByCurrentUser, stateUnion]);

    const fetchHolderInformation = useMemo(
        () =>
            reusePromiseWrapper(
                async () => {
                    await fetchHolder();
                },
                {queue: SHARED_PROMISE_QUEUE}
            ),
        [fetchHolder]
    );

    useEffect(() => {
        const logMessagePrefix = `IdentityHolderAutoFetcher.useEffect:`;
        if (identityHolderFetchInProgress) {
            return;
        }
        if (processingFromClientSideIsInProgress) {
            return;
        }
        if (isNullish(holderProcessingRemoteState)) {
            return;
        }

        const loggerCtx: Record<string, any> = {holderProcessingRemoteState};

        let fetchIntervalMillis = DEFAULT_FETCH_INTERVAL_MILLIS;
        if (holderProcessingRemoteState?.type == 'processingScheduled') {
            fetchIntervalMillis = getScheduledProcessingSafeDelayMillis(holderProcessingRemoteState.scheduledProcessingTimeMillis, loggerCtx);
        }
        if (nonNullish(fetchIntervalForGuestDuringAssetsFetching)) {
            applicationLogger.debug(`${logMessagePrefix} fetchHolder using smaller interval due to guest fetching assets`, {
                originalInterval: fetchIntervalMillis,
                fetchIntervalForGuestDuringAssetsFetching
            });
            fetchIntervalMillis = Math.min(fetchIntervalMillis, fetchIntervalForGuestDuringAssetsFetching);
        }

        const timerId = window.setTimeout(() => {
            applicationLogger.debug(`${logMessagePrefix} fetchHolder timer fired`);
            fetchHolderInformation();
        }, fetchIntervalMillis);

        loggerCtx['timerId'] = timerId;
        loggerCtx['delay'] = fetchIntervalMillis;
        loggerCtx['duration'] = getDurationLabel(fetchIntervalMillis);

        applicationLogger.debug(`${logMessagePrefix} fetchHolder scheduled`, loggerCtx);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [fetchHolderInformation, holderProcessingRemoteState, identityHolderFetchInProgress, processingFromClientSideIsInProgress, fetchIntervalForGuestDuringAssetsFetching]);

    return null;
});

const getDurationLabel = (delayMillis: number) => {
    return formatDuration(delayMillis, {showMillis: true});
};

const getScheduledProcessingSafeDelayMillis = (scheduledProcessingTimeMillis: number, loggerCtx: Record<string, any>) => {
    loggerCtx['scheduledProcessingTimeMillis'] = scheduledProcessingTimeMillis;
    const backendDelayMillis = getDurationTillUTCMillisUnsafe(scheduledProcessingTimeMillis);
    loggerCtx['backendDelayMillis'] = backendDelayMillis;
    loggerCtx['backendDelayMillisDuration'] = formatDuration(backendDelayMillis, {showMillis: true});
    const backendDelayMillisClientSafe = getSafeTimerTimeoutTillUTCMillis(scheduledProcessingTimeMillis);
    loggerCtx['backendDelayMillisClientSafe'] = backendDelayMillisClientSafe;
    loggerCtx['backendDelayMillisClientSafeDuration'] = formatDuration(backendDelayMillisClientSafe, {showMillis: true});
    return getSafeTimerTimeout(backendDelayMillisClientSafe + MIN_FETCH_INTERVAL_MILLIS);
};
