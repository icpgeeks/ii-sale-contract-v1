import {useICCanisterCallContract} from 'frontend/src/api/contract/useICCallContract';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {type ExtractResponseError} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {SetSaleOfferArgs, SetSaleOfferResponse} from 'src/declarations/contract/contract.did';
import {apiLogger} from '../../../logger/logger';
import {notAllowedMessage} from '../../../logger/loggerConstants';
import {useIdentityHolderContextSafe} from '../../IdentityHolderProvider';
import {sleepOnHolderLockedForProcessing} from '../../useIdentityHolder';
import {useOwnerCanSetSaleOffer} from './useOwnerCanSetSaleOffer';

type Response = SetSaleOfferResponse;
type ResponseError = ExtractResponseError<Response>;
type Parameters = SetSaleOfferArgs;

type Context = {
    setSaleOffer: (parameters: Parameters) => Promise<{success: boolean} | undefined>;
    feature: Feature;
    responseError: ResponseError | undefined;
};
export const useSetSaleOffer = () => {
    const {setHolder, updateHolderFeature, fetchHolder, holderIsLockedForProcessing} = useIdentityHolderContextSafe();
    const ownerCanSetListing = useOwnerCanSetSaleOffer();
    const {call, feature, responseError} = useICCanisterCallContract('setSaleOffer');

    const setSaleOffer = useMemo(
        () =>
            reusePromiseWrapper(
                async (parameters: Parameters) => {
                    const logMessagePrefix = `useSetSaleOffer:`;

                    if (!ownerCanSetListing) {
                        apiLogger.debug(notAllowedMessage(logMessagePrefix));
                        return;
                    }

                    await sleepOnHolderLockedForProcessing(holderIsLockedForProcessing, logMessagePrefix);

                    const response = await call([parameters], {
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
                            if (hasProperty(responseError, 'HolderWrongState') || hasProperty(responseError, 'HigherBuyerOfferExists')) {
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
        [ownerCanSetListing, holderIsLockedForProcessing, call, fetchHolder, setHolder, updateHolderFeature]
    );

    return useMemo<Context>(
        () => ({
            setSaleOffer,
            feature,
            responseError
        }),
        [setSaleOffer, feature, responseError]
    );
};
