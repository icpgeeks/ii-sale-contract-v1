import {useICCanisterCallContract} from 'frontend/src/api/contract/useICCallContract';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import type {ExtractResponseError} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {AcceptBuyerOfferResponse, RestartReleaseIdentityArgs} from 'src/declarations/contract/contract.did';
import {apiLogger} from '../../../logger/logger';
import {notOwnerMessage} from '../../../logger/loggerConstants';
import {useIdentityHolderContextSafe} from '../../IdentityHolderProvider';
import {sleepOnHolderLockedForProcessing} from '../../useIdentityHolder';

type Response = AcceptBuyerOfferResponse;
type ResponseError = ExtractResponseError<Response>;
type Parameters = RestartReleaseIdentityArgs;

type Context = {
    restartReleaseIdentity: (params: Parameters) => Promise<{success: boolean} | undefined>;
    feature: Feature;
    responseError: ResponseError | undefined;
};
export const useRestartReleaseIdentity = () => {
    const {setHolder, updateHolderFeature, fetchHolder, isOwnedByCurrentUser, holderIsLockedForProcessing} = useIdentityHolderContextSafe();
    const {call, feature, responseError} = useICCanisterCallContract('restartReleaseIdentity');

    const restartReleaseIdentity = useMemo(
        () =>
            reusePromiseWrapper(
                async (params: Parameters) => {
                    const logMessagePrefix = `useRestartReleaseIdentity:`;

                    if (!isOwnedByCurrentUser) {
                        apiLogger.debug(notOwnerMessage(logMessagePrefix));
                        return;
                    }

                    await sleepOnHolderLockedForProcessing(holderIsLockedForProcessing, logMessagePrefix);

                    const response = await call([params], {
                        logger: apiLogger,
                        logMessagePrefix,
                        onResponseOkBeforeExit: async (responseOk) => {
                            setHolder(responseOk.holder_information);
                            updateHolderFeature({
                                status: {inProgress: false, loaded: true},
                                error: {isError: false, error: undefined}
                            });
                        },
                        onResponseErrorBeforeExit: async (responseError) => {
                            if (hasProperty(responseError, 'HolderWrongState')) {
                                await fetchHolder();
                            }
                        },
                        onThrownErrorBeforeExit: async () => {
                            await fetchHolder();
                        }
                    });

                    if (hasProperty(response, 'Ok')) {
                        return {success: true};
                    }
                },
                {queue: SHARED_PROMISE_QUEUE}
            ),
        [isOwnedByCurrentUser, holderIsLockedForProcessing, call, setHolder, updateHolderFeature, fetchHolder]
    );

    return useMemo<Context>(
        () => ({
            restartReleaseIdentity,
            feature,
            responseError
        }),
        [restartReleaseIdentity, feature, responseError]
    );
};
