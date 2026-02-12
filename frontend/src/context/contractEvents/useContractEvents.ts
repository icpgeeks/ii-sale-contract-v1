import {toNullable} from '@dfinity/utils';
import {useICCanisterCallContractAnonymous} from 'frontend/src/api/contract/useICCallContract';
import {getICFirstKey, type ExtractOptional} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {ChunkDef, GetHolderEventsArgs, GetHolderEventsResult} from 'src/declarations/contract/contract.did';
import {toError} from '../../utils/core/error/toError';
import {reusePromiseWrapper} from '../../utils/core/promise/reusePromise';
import {hasProperty} from '../../utils/core/typescript/typescriptAddons';
import {apiLogger} from '../logger/logger';
import {caughtErrorMessage} from '../logger/loggerConstants';

export type FetchChunkParametersSorting = ExtractOptional<GetHolderEventsArgs['sorting']>;

export type FetchChunkParameters = {
    sorting?: FetchChunkParametersSorting;
    count: number;
    start: number;
};
type Context = {
    fetchChunk: (parameters: FetchChunkParameters) => Promise<GetHolderEventsResult>;
};

export const useContractEvents = (): Context => {
    const {call} = useICCanisterCallContractAnonymous('getHolderEvents');

    const fetchChunk = useMemo(
        () =>
            reusePromiseWrapper(async (parameters: FetchChunkParameters) => {
                const logMessagePrefix = `useContractEvents:`;
                try {
                    const chunkDef: ChunkDef = {
                        count: BigInt(parameters.count),
                        start: BigInt(parameters.start)
                    };
                    const chunkArgs: GetHolderEventsArgs = {
                        sorting: toNullable(parameters.sorting),
                        chunk_def: chunkDef
                    };
                    const response = await call([chunkArgs], {
                        logger: apiLogger,
                        logMessagePrefix,
                        onResponseErrorBeforeExit: async (responseError) => {
                            throw toError(getICFirstKey(responseError));
                        }
                    });
                    if (hasProperty(response, 'Ok')) {
                        return response.Ok;
                    } else if (hasProperty(response, 'Err')) {
                        throw toError(getICFirstKey(response.Err));
                    }

                    // Fallback: (unlikely, but message can be too large - exceeds 2MB limit).
                    return await fetchChunkItemByItem(chunkArgs, call, logMessagePrefix);
                } catch (e) {
                    apiLogger.error(caughtErrorMessage(logMessagePrefix), e);
                    throw toError(e);
                }
            }),
        [call]
    );

    return useMemo(() => ({fetchChunk}), [fetchChunk]);
};

/**
 * Fallback logic to fetch events one-by-one when bulk request throws (likely exceeds 2MB limit)
 */
async function fetchChunkItemByItem(
    itemArgs: GetHolderEventsArgs,
    call: ReturnType<typeof useICCanisterCallContractAnonymous<'getHolderEvents'>>['call'],
    logMessagePrefix: string
): Promise<GetHolderEventsResult> {
    const functionLogMessagePrefix = `${logMessagePrefix} fetchChunkItemByItem:`;
    apiLogger.warn(`${logMessagePrefix} response.Thrown — falling back to single-item requests`);

    const requestCount = Number(itemArgs.chunk_def.count);
    const startIndex = Number(itemArgs.chunk_def.start);

    // Build per-item calls
    const singleEventPromises: Array<ReturnType<typeof call>> = [];
    for (let i = 0; i < requestCount; i++) {
        const singleItemChunk: ChunkDef = {
            count: 1n,
            start: BigInt(startIndex + i)
        };
        const singleItemArgs: GetHolderEventsArgs = {
            sorting: itemArgs.sorting,
            chunk_def: singleItemChunk
        };

        singleEventPromises.push(
            call([singleItemArgs], {
                logger: apiLogger,
                logMessagePrefix: `${logMessagePrefix} (single ${i})`,
                onResponseErrorBeforeExit: async (responseError) => {
                    throw toError(getICFirstKey(responseError));
                }
            })
        );
    }

    const singleEventSettledResponses = await Promise.all(singleEventPromises);

    // Collect Ok results and merge their events arrays.
    const allEvents: GetHolderEventsResult['events'] = [];
    let totalCount = 0n;

    for (const r of singleEventSettledResponses) {
        if (hasProperty(r, 'Ok')) {
            allEvents.push(...r.Ok.events);
            // Use the total_count from the first response (they should all be the same)
            if (totalCount === 0n) {
                totalCount = r.Ok.total_count;
            }
        } else if (hasProperty(r, 'Err')) {
            throw toError(getICFirstKey(r.Err));
        } else {
            // still thrown for a single item — escalate
            throw r.Thrown;
        }
    }

    // Check for duplicate event IDs
    const eventIds = new Set<bigint>();
    for (const event of allEvents) {
        if (eventIds.has(event.id)) {
            const errorMessage = `${functionLogMessagePrefix} duplicate event ID detected: ${event.id}`;
            throw new Error(errorMessage);
        }
        eventIds.add(event.id);
    }

    return {
        events: allEvents,
        total_count: totalCount
    };
}
