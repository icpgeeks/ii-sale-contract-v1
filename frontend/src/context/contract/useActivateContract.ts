import {isEmptyString, isNullish} from '@dfinity/utils';
import {useICCanisterCallContract} from 'frontend/src/api/contract/useICCallContract';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import type {ExtractResponseError} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {ActivateContractArgs, ActivateContractResponse} from 'src/declarations/contract/contract.did';
import {useIdentityHolderContext} from '../identityHolder/IdentityHolderProvider';
import {apiLogger} from '../logger/logger';
import {skipMessage} from '../logger/loggerConstants';

type Response = ActivateContractResponse;
type ResponseError = ExtractResponseError<Response>;

type Context = {
    responseError: ResponseError | undefined;
    feature: Feature;
    activateContract: (activationCode: string | undefined | null) => Promise<boolean>;
};
export const useActivateContract = () => {
    const {principal} = useAuthContext();
    const {fetchHolder} = useIdentityHolderContext();
    const {call, feature, responseError} = useICCanisterCallContract('activateContract');

    const activateContract: Context['activateContract'] = useMemo(
        () =>
            reusePromiseWrapper(
                async (activationCode: string | undefined | null) => {
                    const logMessagePrefix = `useActivateContract:`;

                    if (isEmptyString(activationCode)) {
                        apiLogger.debug(skipMessage(logMessagePrefix, 'no activation code'));
                        return false;
                    }

                    if (isNullish(principal)) {
                        apiLogger.debug(skipMessage(logMessagePrefix, 'no principal'));
                        return false;
                    }

                    const parameters: ActivateContractArgs = {
                        contract_owner: principal,
                        check_permission_strategy: {
                            CheckContractActivationCode: {code: activationCode}
                        }
                    };
                    const response = await call([parameters], {
                        logger: apiLogger,
                        logMessagePrefix,
                        onResponseOkBeforeExit: async () => {
                            await fetchHolder();
                        },
                        onResponseErrorBeforeExit: async () => {
                            await fetchHolder();
                        }
                    });
                    if (hasProperty(response, 'Ok')) {
                        return true;
                    }
                    return false;
                },
                {queue: SHARED_PROMISE_QUEUE}
            ),
        [principal, call, fetchHolder]
    );

    return useMemo<Context>(
        () => ({
            responseError,
            feature,
            activateContract
        }),
        [responseError, feature, activateContract]
    );
};
