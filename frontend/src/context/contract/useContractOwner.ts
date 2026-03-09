import type {Principal} from '@dfinity/principal';
import {useICCanisterCallContractAnonymous} from 'frontend/src/api/contract/useICCallContract';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper} from 'frontend/src/utils/core/promise/reusePromise';
import {getICFirstKey, type ExtractResponseError} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {GetContractOwnerResponse} from 'src/declarations/contract/contract.did';
import {apiLogger} from '../logger/logger';

type Response = GetContractOwnerResponse;
type ResponseError = ExtractResponseError<Response>;

type Context = {
    owner: Principal | undefined;
    isOwnedByCurrentUser: boolean;
    feature: Feature;
    responseError: ResponseError | undefined;
    fetchContractOwner: () => Promise<void>;
};

export const useContractOwner = (): Context => {
    const {isCurrentLoggedInPrincipal} = useAuthContext();
    const {call, data, feature, responseError} = useICCanisterCallContractAnonymous('getContractOwner');

    const fetchContractOwner = useMemo(
        () =>
            reusePromiseWrapper(async () => {
                const logMessagePrefix = `useContractOwner:`;
                await call([], {
                    logger: apiLogger,
                    logMessagePrefix,
                    onResponseErrorBeforeExit: async (responseError) => {
                        throw new Error(getICFirstKey(responseError));
                    }
                });
            }),
        [call]
    );

    const owner = data?.owner;

    const isOwnedByCurrentUser: boolean = useMemo(() => {
        return isCurrentLoggedInPrincipal(owner);
    }, [isCurrentLoggedInPrincipal, owner]);

    return useMemo(
        () => ({
            owner,
            isOwnedByCurrentUser,
            feature,
            responseError,
            fetchContractOwner
        }),
        [owner, isOwnedByCurrentUser, feature, responseError, fetchContractOwner]
    );
};
