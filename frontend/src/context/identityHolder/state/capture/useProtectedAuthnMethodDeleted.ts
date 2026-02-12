import {useICCanisterCallContract} from 'frontend/src/api/contract/useICCallContract';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {apiLogger} from 'frontend/src/context/logger/logger';
import {notOwnerMessage} from 'frontend/src/context/logger/loggerConstants';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import type {ExtractResponseError} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {AcceptBuyerOfferResponse} from 'src/declarations/contract/contract.did';
import {sleepOnHolderLockedForProcessing} from '../../useIdentityHolder';

type Response = AcceptBuyerOfferResponse;
type ResponseError = ExtractResponseError<Response>;

type Context = {
    protectedAuthnMethodDeleted: () => Promise<void>;
    feature: Feature;
    responseError: ResponseError | undefined;
};
export const useProtectedAuthnMethodDeleted = () => {
    const {setHolder, updateHolderFeature, fetchHolder, isOwnedByCurrentUser, holderIsLockedForProcessing} = useIdentityHolderContextSafe();
    const {call, feature, responseError} = useICCanisterCallContract('protectedAuthnMethodDeleted');

    const protectedAuthnMethodDeleted = useMemo(
        () =>
            reusePromiseWrapper(
                async () => {
                    const logMessagePrefix = `useProtectedAuthnMethodDeleted:`;

                    if (!isOwnedByCurrentUser) {
                        apiLogger.debug(notOwnerMessage(logMessagePrefix));
                        return;
                    }

                    await sleepOnHolderLockedForProcessing(holderIsLockedForProcessing, logMessagePrefix);

                    await call([], {
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
                },
                {queue: SHARED_PROMISE_QUEUE}
            ),
        [call, fetchHolder, holderIsLockedForProcessing, isOwnedByCurrentUser, setHolder, updateHolderFeature]
    );

    return useMemo<Context>(() => ({protectedAuthnMethodDeleted, feature, responseError}), [protectedAuthnMethodDeleted, feature, responseError]);
};
