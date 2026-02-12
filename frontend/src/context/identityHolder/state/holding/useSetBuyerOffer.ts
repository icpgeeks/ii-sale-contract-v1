import {useICCanisterCallContract} from 'frontend/src/api/contract/useICCallContract';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {type ExtractResponseError} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {SetBuyerOfferArgs, SetBuyerOfferResponse} from 'src/declarations/contract/contract.did';
import {apiLogger} from '../../../logger/logger';
import {notAllowedMessage} from '../../../logger/loggerConstants';
import {useIdentityHolderContextSafe} from '../../IdentityHolderProvider';
import {sleepOnHolderLockedForProcessing} from '../../useIdentityHolder';
import {useBuyerCanSetOffer} from './useBuyerCanSetOffer';

type Response = SetBuyerOfferResponse;
type ResponseError = ExtractResponseError<Response>;
type Parameters = SetBuyerOfferArgs;

type Context = {
    setBuyerOffer: (parameters: Parameters) => Promise<{success: boolean} | undefined>;
    reset: () => void;
    feature: Feature;
    responseError: ResponseError | undefined;
};

export const useSetBuyerOffer = () => {
    const {setHolder, updateHolderFeature, fetchHolder, holderIsLockedForProcessing} = useIdentityHolderContextSafe();
    const buyerCanSetOffer = useBuyerCanSetOffer();
    const {call, feature, responseError, reset} = useICCanisterCallContract('setBuyerOffer');

    const setBuyerOffer = useMemo(
        () =>
            reusePromiseWrapper(
                async (parameters: Parameters) => {
                    const logMessagePrefix = `useSetBuyerOffer:`;

                    if (!buyerCanSetOffer) {
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
                            if (hasProperty(responseError, 'HolderWrongState') || hasProperty(responseError, 'OfferAmountExceedsPrice')) {
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
        [buyerCanSetOffer, holderIsLockedForProcessing, call, setHolder, updateHolderFeature, fetchHolder]
    );

    return useMemo<Context>(
        () => ({
            setBuyerOffer,
            feature,
            responseError,
            reset
        }),
        [setBuyerOffer, feature, responseError, reset]
    );
};
