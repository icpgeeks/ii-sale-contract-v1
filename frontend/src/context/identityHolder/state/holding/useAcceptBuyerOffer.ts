import {useICCanisterCallContract} from 'frontend/src/api/contract/useICCallContract';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {type ExtractResponseError} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {AcceptBuyerOfferArgs, AcceptBuyerOfferResponse} from 'src/declarations/contract/contract.did';
import {apiLogger} from '../../../logger/logger';
import {notAllowedMessage} from '../../../logger/loggerConstants';
import {useIdentityHolderContextSafe} from '../../IdentityHolderProvider';
import {sleepOnHolderLockedForProcessing} from '../../useIdentityHolder';
import {useOwnerCanAcceptBuyerOffer} from './useOwnerCanAcceptBuyerOffer';

type Response = AcceptBuyerOfferResponse;
type ResponseError = ExtractResponseError<Response>;
type Parameters = AcceptBuyerOfferArgs;

type Context = {
    acceptBuyerOffer: (parameters: Parameters) => Promise<{success: boolean} | undefined>;
    feature: Feature;
    responseError: ResponseError | undefined;
};
export const useAcceptBuyerOffer = () => {
    const {setHolder, updateHolderFeature, fetchHolder, holderIsLockedForProcessing} = useIdentityHolderContextSafe();
    const ownerCanAcceptBuyerOffer = useOwnerCanAcceptBuyerOffer();
    const {call, feature, responseError} = useICCanisterCallContract('acceptBuyerOffer');

    const acceptBuyerOffer = useMemo(
        () =>
            reusePromiseWrapper(
                async (parameters: Parameters) => {
                    const logMessagePrefix = `useAcceptBuyerOffer:`;

                    if (!ownerCanAcceptBuyerOffer) {
                        apiLogger.debug(notAllowedMessage(logMessagePrefix));
                        return;
                    }

                    await sleepOnHolderLockedForProcessing(holderIsLockedForProcessing, logMessagePrefix);

                    const response = await call([parameters], {
                        logger: apiLogger,
                        logMessagePrefix,
                        argsToLog: [
                            {
                                buyer: parameters.buyer.toText(),
                                offer_amount: parameters.offer_amount
                            }
                        ],
                        onResponseOkBeforeExit: async (responseOk) => {
                            setHolder(responseOk.holder_information);
                            updateHolderFeature({
                                status: {inProgress: false, loaded: true},
                                error: {isError: false, error: undefined}
                            });
                        },
                        onResponseErrorBeforeExit: async (responseError) => {
                            if (hasProperty(responseError, 'HolderWrongState') || hasProperty(responseError, 'OfferMismatch') || hasProperty(responseError, 'HigherBuyerOfferExists')) {
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
        [ownerCanAcceptBuyerOffer, holderIsLockedForProcessing, call, setHolder, updateHolderFeature, fetchHolder]
    );

    return useMemo<Context>(
        () => ({
            acceptBuyerOffer,
            feature,
            responseError
        }),
        [acceptBuyerOffer, feature, responseError]
    );
};
