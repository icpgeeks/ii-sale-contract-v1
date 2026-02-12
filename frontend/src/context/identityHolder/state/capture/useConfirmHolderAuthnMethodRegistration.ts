import {useICCanisterCallContract} from 'frontend/src/api/contract/useICCallContract';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {apiLogger} from 'frontend/src/context/logger/logger';
import {notOwnerMessage} from 'frontend/src/context/logger/loggerConstants';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import type {ExtractResponseError} from 'frontend/src/utils/ic/did';
import {remapToLegacyDomain} from 'frontend/src/utils/ic/domain';
import {useMemo} from 'react';
import type {CancelSaleIntentionResponse, ConfirmHolderAuthnMethodRegistrationArgs} from 'src/declarations/contract/contract.did';
import {sleepOnHolderLockedForProcessing} from '../../useIdentityHolder';

type Response = CancelSaleIntentionResponse;
type ResponseError = ExtractResponseError<Response>;
type Parameters = ConfirmHolderAuthnMethodRegistrationArgs;

type Context = {
    confirmHolderAuthnMethodRegistration: () => Promise<void>;
    feature: Feature;
    responseError: ResponseError | undefined;
};
export const useConfirmHolderAuthnMethodRegistration = () => {
    const {setHolder, updateHolderFeature, fetchHolder, isOwnedByCurrentUser, holderIsLockedForProcessing} = useIdentityHolderContextSafe();
    const {call, feature, responseError} = useICCanisterCallContract('confirmHolderAuthnMethodRegistration');

    const confirmHolderAuthnMethodRegistration = useMemo(
        () =>
            reusePromiseWrapper(
                async () => {
                    const logMessagePrefix = `useConfirmHolderAuthnMethodRegistration:`;

                    if (!isOwnedByCurrentUser) {
                        apiLogger.debug(notOwnerMessage(logMessagePrefix));
                        return;
                    }

                    await sleepOnHolderLockedForProcessing(holderIsLockedForProcessing, logMessagePrefix);

                    const parameters: Parameters = {
                        frontend_hostname: remapToLegacyDomain(window.origin)
                    };
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

    return useMemo<Context>(() => ({confirmHolderAuthnMethodRegistration, feature, responseError}), [confirmHolderAuthnMethodRegistration, feature, responseError]);
};
