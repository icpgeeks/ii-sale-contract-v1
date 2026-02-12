import {Principal} from '@dfinity/principal';
import {toError} from 'frontend/src/utils/core/error/toError';
import {type Feature, useFeature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {safeCall} from 'frontend/src/utils/ic/api/safeCall';
import {isCanisterPrincipalValid} from 'frontend/src/utils/ic/principal';
import {useMemo, useState} from 'react';
import {apiLogger} from '../logger/logger';
import {caughtErrorMessage} from '../logger/loggerConstants';

type Context = {
    currentCanister: Principal | undefined;
    currentCanisterId: string | undefined;
    feature: Feature;
    fetchCurrentCanisterId: () => Promise<void>;
};

export const useContractCanisterId = () => {
    const [currentCanister, setCurrentCanister] = useState<Principal | undefined>(undefined);
    const [feature, updateFeature] = useFeature();

    const fetchCurrentCanisterId = useMemo(
        () =>
            reusePromiseWrapper(async () => {
                const logMessagePrefix = 'useCurrentCanisterId:';
                try {
                    updateFeature({status: {inProgress: true}});

                    const call = safeCall(fetch, {logger: apiLogger, logMessagePrefix});
                    const response = await call('/get_canister_id');
                    if (hasProperty(response, 'Ok')) {
                        const canisterId = await response.Ok.text();
                        apiLogger.log(`${logMessagePrefix} result`, {canisterId});
                        if (isCanisterPrincipalValid(canisterId)) {
                            setCurrentCanister(Principal.fromText(canisterId));
                            updateFeature({
                                status: {inProgress: false, loaded: true},
                                error: {isError: false, error: undefined}
                            });
                        } else {
                            throw new Error('invalidCanisterPrincipal');
                        }
                    } else {
                        throw response.Thrown;
                    }
                } catch (e) {
                    apiLogger.error(caughtErrorMessage(logMessagePrefix), e);
                    setCurrentCanister(undefined);
                    updateFeature({
                        status: {inProgress: false, loaded: true},
                        error: {isError: true, error: toError(e)}
                    });
                }
            }),
        [updateFeature]
    );

    return useMemo<Context>(
        () => ({
            currentCanister,
            currentCanisterId: currentCanister?.toText(),
            feature,
            fetchCurrentCanisterId
        }),
        [currentCanister, feature, fetchCurrentCanisterId]
    );
};
