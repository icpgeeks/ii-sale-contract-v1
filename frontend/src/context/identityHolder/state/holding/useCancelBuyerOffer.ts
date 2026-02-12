import {useICCanisterCallContract} from 'frontend/src/api/contract/useICCallContract';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {type ExtractResponseError} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {CancelBuyerOfferResponse} from 'src/declarations/contract/contract.did';
import {apiLogger} from '../../../logger/logger';
import {notAllowedMessage} from '../../../logger/loggerConstants';
import {useIdentityHolderContextSafe} from '../../IdentityHolderProvider';
import {sleepOnHolderLockedForProcessing} from '../../useIdentityHolder';
import {useBuyerCanCancelOffer} from './useBuyerCanCancelOffer';

type Response = CancelBuyerOfferResponse;
type ResponseError = ExtractResponseError<Response>;

type Context = {
    cancelBuyerOffer: () => Promise<{success: boolean} | undefined>;
    feature: Feature;
    responseError: ResponseError | undefined;
};

export const useCancelBuyerOffer = () => {
    const {setHolder, updateHolderFeature, fetchHolder, holderIsLockedForProcessing} = useIdentityHolderContextSafe();
    const buyerCanCancelOffer = useBuyerCanCancelOffer();
    const {call, feature, responseError} = useICCanisterCallContract('cancelBuyerOffer');

    const cancelBuyerOffer = useMemo(
        () =>
            reusePromiseWrapper(
                async () => {
                    const logMessagePrefix = `useCancelBuyerOffer:`;

                    if (!buyerCanCancelOffer) {
                        apiLogger.debug(notAllowedMessage(logMessagePrefix));
                        return;
                    }

                    await sleepOnHolderLockedForProcessing(holderIsLockedForProcessing, logMessagePrefix);

                    const response = await call([], {
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
        [buyerCanCancelOffer, holderIsLockedForProcessing, call, setHolder, updateHolderFeature, fetchHolder]
    );

    return useMemo<Context>(
        () => ({
            cancelBuyerOffer,
            feature,
            responseError
        }),
        [cancelBuyerOffer, feature, responseError]
    );
};
