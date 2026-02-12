import {useICCanisterCallContract} from 'frontend/src/api/contract/useICCallContract';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import type {ExtractResponseError} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {AcceptBuyerOfferResponse, ConfirmOwnerAuthnMethodRegistrationArgs} from 'src/declarations/contract/contract.did';
import {apiLogger} from '../../../logger/logger';
import {notOwnerMessage} from '../../../logger/loggerConstants';
import {useIdentityHolderContextSafe} from '../../IdentityHolderProvider';
import {sleepOnHolderLockedForProcessing} from '../../useIdentityHolder';

type Response = AcceptBuyerOfferResponse;
type ResponseError = ExtractResponseError<Response>;
type Parameters = ConfirmOwnerAuthnMethodRegistrationArgs;

type Context = {
    confirmOwnerAuthnMethodRegistration: (parameters: Parameters) => Promise<void>;
    feature: Feature;
    responseError: ResponseError | undefined;
};
export const useConfirmOwnerAuthnMethodRegistration = () => {
    const {setHolder, updateHolderFeature, fetchHolder, isOwnedByCurrentUser, holderIsLockedForProcessing} = useIdentityHolderContextSafe();
    const {call, feature, responseError} = useICCanisterCallContract('confirmOwnerAuthnMethodRegistration');

    const confirmOwnerAuthnMethodRegistration = useMemo(
        () =>
            reusePromiseWrapper(
                async (parameters: Parameters) => {
                    const logMessagePrefix = `confirmOwnerAuthnMethodRegistration:`;

                    if (!isOwnedByCurrentUser) {
                        apiLogger.debug(notOwnerMessage(logMessagePrefix));
                        return;
                    }

                    await sleepOnHolderLockedForProcessing(holderIsLockedForProcessing, logMessagePrefix);

                    await call([parameters], {
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

    return useMemo<Context>(() => ({confirmOwnerAuthnMethodRegistration, feature, responseError}), [confirmOwnerAuthnMethodRegistration, feature, responseError]);
};
