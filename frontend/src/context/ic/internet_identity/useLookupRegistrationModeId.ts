import {assertNonNullish, fromNullable, isNullish} from '@dfinity/utils';
import {useFeature, type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import type {IdentityNumber, RegistrationId} from 'frontend/src/utils/ic/api/internet_identity/internet_identity.did';
import {useInternetIdentityAnonymousCanisterFactory} from 'frontend/src/utils/ic/api/internet_identity/useICCallInternetIdentity';
import {safeCall} from 'frontend/src/utils/ic/api/safeCall';
import {useMemo, useState} from 'react';
import {useIdentityHolderContext} from '../../identityHolder/IdentityHolderProvider';
import {apiLogger} from '../../logger/logger';
import {notOwnerMessage} from '../../logger/loggerConstants';

type ResponseError = {IdentityNumberNotFound: null};
type Parameter = RegistrationId;

type Context = {
    lookupByRegistrationModeId: (registrationId: Parameter) => Promise<IdentityNumber | undefined>;
    feature: Feature;
    responseError: ResponseError | undefined;
};
export const useLookupRegistrationModeId = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContext();
    const {getActor} = useInternetIdentityAnonymousCanisterFactory();
    const [feature, updateFeature] = useFeature();
    const [responseError, setResponseError] = useState<ResponseError>();

    const lookupByRegistrationModeId = useMemo(
        () =>
            reusePromiseWrapper(
                async (registrationId: Parameter) => {
                    const logMessagePrefix = `useLookupRegistrationModeId[${registrationId}]:`;

                    if (!isOwnedByCurrentUser) {
                        apiLogger.debug(notOwnerMessage(logMessagePrefix));
                        return;
                    }

                    setResponseError(undefined);
                    updateFeature({
                        status: {inProgress: true},
                        error: {isError: false, error: undefined}
                    });

                    const actor = await getActor();
                    assertNonNullish(actor, 'noActor');

                    const call = safeCall(actor.lookupByRegistrationModeId, {logger: apiLogger, logMessagePrefix});
                    const response = await call(registrationId);
                    if (hasProperty(response, 'Ok')) {
                        const identityNumber = fromNullable(response.Ok);
                        if (isNullish(identityNumber)) {
                            setResponseError({IdentityNumberNotFound: null});
                        } else {
                            setResponseError(undefined);
                        }
                        updateFeature({
                            status: {inProgress: false, loaded: true},
                            error: {isError: false, error: undefined}
                        });
                        return identityNumber;
                    }
                    setResponseError(undefined);
                    updateFeature({
                        status: {inProgress: false, loaded: true},
                        error: {isError: true, error: response.Thrown}
                    });
                    return undefined;
                },
                {queue: SHARED_PROMISE_QUEUE}
            ),
        [isOwnedByCurrentUser, getActor, updateFeature]
    );

    return useMemo<Context>(
        () => ({
            lookupByRegistrationModeId,
            feature,
            responseError
        }),
        [lookupByRegistrationModeId, feature, responseError]
    );
};
