import {useICCanisterCallContract} from 'frontend/src/api/contract/useICCallContract';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {type ExtractResponseError} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {AddContractControllerArgs, AddContractControllerResponse} from 'src/declarations/contract/contract.did';
import {apiLogger} from '../../../logger/logger';
import {notOwnerMessage} from '../../../logger/loggerConstants';
import {useIdentityHolderContext} from '../../IdentityHolderProvider';
import {sleepOnHolderLockedForProcessing} from '../../useIdentityHolder';

type Response = AddContractControllerResponse;
type ResponseError = ExtractResponseError<Response>;
type Parameters = AddContractControllerArgs;

type Context = {
    addContractController: (parameters: Parameters) => Promise<{success: boolean} | undefined>;
    feature: Feature;
    responseError: ResponseError | undefined;
};

export const useAddContractController = () => {
    const {fetchHolder, holderIsLockedForProcessing, isOwnedByCurrentUser} = useIdentityHolderContext();
    const {call, feature, responseError} = useICCanisterCallContract('addContractController');

    const addContractController = useMemo(
        () =>
            reusePromiseWrapper(
                async (parameters: Parameters) => {
                    const logMessagePrefix = `useAddContractController:`;

                    if (!isOwnedByCurrentUser) {
                        apiLogger.debug(notOwnerMessage(logMessagePrefix));
                        return;
                    }

                    await sleepOnHolderLockedForProcessing(holderIsLockedForProcessing, logMessagePrefix);

                    const response = await call([parameters], {
                        logger: apiLogger,
                        logMessagePrefix,
                        onResponseErrorBeforeExit: async () => {
                            await fetchHolder();
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
        [isOwnedByCurrentUser, holderIsLockedForProcessing, call, fetchHolder]
    );

    return useMemo<Context>(
        () => ({
            addContractController,
            feature,
            responseError
        }),
        [addContractController, feature, responseError]
    );
};
