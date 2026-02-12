import {nonNullish} from '@dfinity/utils';
import {useICCanisterCallContractAnonymous} from 'frontend/src/api/contract/useICCallContract';
import {makeQueryRequestWithPresignedEnvelope} from 'frontend/src/utils/ic/api/query';
import {getICFirstKey} from 'frontend/src/utils/ic/did';
import {createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState} from 'react';
import type {QueryCanisterSignedRequest, ReceiveDelegationArgs} from 'src/declarations/contract/contract.did';
import {MILLIS_PER_SECOND} from '../../utils/core/date/constants';
import {toError} from '../../utils/core/error/toError';
import {type FStatus, useFStatus} from '../../utils/core/feature/feature';
import {reusePromiseWrapper, SHARED_PROMISE_QUEUE} from '../../utils/core/promise/reusePromise';
import {hasProperty} from '../../utils/core/typescript/typescriptAddons';
import {apiLogger, applicationLogger} from '../logger/logger';
import {caughtErrorMessage, exhaustiveCheckFailedMessage} from '../logger/loggerConstants';
import {useIdentityHolderContext} from './IdentityHolderProvider';
import {getHoldingFetchingAssetsObtainDelegationStateGetDelegationWaitingSignedRequest} from './identityHolderUtils';

type ActionErrorRequestWithPresignedEnvelopeFailed = {
    type: 'requestWithPresignedEnvelopeFailed';
    error: Error;
};
type ActionErrorReceiveDelegationRequestFailed = {
    type: 'receiveDelegationRequestFailed';
    error: Error;
};
type ActionErrorRetryPrepareDelegationFailed = {
    type: 'retryPrepareDelegationFailed';
    error: Error;
};
type ActionError = ActionErrorRequestWithPresignedEnvelopeFailed | ActionErrorReceiveDelegationRequestFailed | ActionErrorRetryPrepareDelegationFailed;

type ProcessingStateAutomaticAction_PassDelegateToTheBackend = {
    type: 'passDelegateToTheBackend';
    get_delegation_request: QueryCanisterSignedRequest;
};

type ProcessingStateAutomaticAction_RetryPrepareDelegation = {
    type: 'retryPrepareDelegation';
    error: Error;
};

type ProcessingStateAutomatic = {
    processing: 'automatic';
    action: ProcessingStateAutomaticAction_PassDelegateToTheBackend | ProcessingStateAutomaticAction_RetryPrepareDelegation;
};

type ProcessingStateNone = {
    processing: 'none';
};
type ProcessingState = ProcessingStateAutomatic | ProcessingStateNone;

type Context = {
    automaticProcessingInProgress: boolean;
    processInProgress: boolean;
    processStatus: FStatus;
    processingState: ProcessingState;
};

const Context = createContext<Context | undefined>(undefined);
export const useIdentityHolderProcessorContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityHolderProcessorContext must be used within a IdentityHolderProcessor');
    }
    return context;
};

export const IdentityHolderProcessor = (props: PropsWithChildren) => {
    const {holder, setHolder, feature, updateHolderFeature, fetchHolder} = useIdentityHolderContext();

    const {call: receiveDelegationCall} = useICCanisterCallContractAnonymous('receiveDelegation');
    const {call: retryPrepareDelegationCall} = useICCanisterCallContractAnonymous('retryPrepareDelegation');

    const [processStatus, updateProcessStatus] = useFStatus();
    const processInProgress = processStatus.inProgress;

    const [actionError, setActionError] = useState<ActionError | undefined>(undefined);

    const getDelegationWaitingSignedRequest = useMemo(() => getHoldingFetchingAssetsObtainDelegationStateGetDelegationWaitingSignedRequest(holder?.state), [holder?.state]);

    const processingState: ProcessingState = useMemo<ProcessingState>(() => {
        if (feature.error.isError) {
            return {
                processing: 'none'
            };
        }

        if (nonNullish(actionError)) {
            const action: ProcessingStateAutomaticAction_RetryPrepareDelegation = {
                type: 'retryPrepareDelegation',
                error: actionError.error
            };
            const result: ProcessingStateAutomatic = {
                processing: 'automatic',
                action: action
            };
            return result;
        }

        if (nonNullish(getDelegationWaitingSignedRequest)) {
            const action: ProcessingStateAutomaticAction_PassDelegateToTheBackend = {
                type: 'passDelegateToTheBackend',
                get_delegation_request: getDelegationWaitingSignedRequest
            };
            const result: ProcessingStateAutomatic = {
                processing: 'automatic',
                action: action
            };
            return result;
        }

        return {processing: 'none'};
    }, [actionError, feature.error, getDelegationWaitingSignedRequest]);

    const automaticProcessingInProgress = processingState.processing == 'automatic';

    const tryToPassDelegateToTheBackend = useMemo(
        () =>
            reusePromiseWrapper(
                async (get_delegation_request: QueryCanisterSignedRequest) => {
                    const logMessagePrefix = `IdentityHolderProcessor.tryToPassDelegateToTheBackend:`;
                    try {
                        updateProcessStatus({inProgress: true});

                        let responseBody: Uint8Array | undefined;
                        try {
                            responseBody = await makeQueryRequestWithPresignedEnvelope(
                                {
                                    canisterId: get_delegation_request.canister_id.toText(),
                                    body: get_delegation_request.request_sign
                                },
                                {
                                    logger: apiLogger,
                                    logMessagePrefix: `${logMessagePrefix} makeQueryRequestWithPresignedEnvelope`
                                }
                            );
                        } catch (e) {
                            apiLogger.error(caughtErrorMessage(`${logMessagePrefix} makeQueryRequestWithPresignedEnvelope:`), e);
                            updateProcessStatus({inProgress: false, loaded: true});
                            setActionError({type: 'requestWithPresignedEnvelopeFailed', error: toError(e)});
                            return;
                        }

                        const parameters: ReceiveDelegationArgs = {
                            get_delegation_response: responseBody
                        };

                        const response = await receiveDelegationCall([parameters], {logger: apiLogger, logMessagePrefix});
                        if (hasProperty(response, 'Ok')) {
                            setHolder(response.Ok.holder_information);
                            updateHolderFeature({
                                status: {inProgress: false, loaded: true},
                                error: {isError: false, error: undefined}
                            });
                            updateProcessStatus({inProgress: false, loaded: true});
                            setActionError(undefined);
                            return;
                        } else if (hasProperty(response, 'Err')) {
                            if (hasProperty(response.Err, 'ResponseNotContainsDelegation') || hasProperty(response.Err, 'DelegationWrong')) {
                                apiLogger.debug(`${logMessagePrefix} something wrong with delegation. Will retry.`);
                                const error = toError(getICFirstKey(response.Err));
                                updateProcessStatus({inProgress: false, loaded: true});
                                setActionError({type: 'receiveDelegationRequestFailed', error});
                            } else {
                                await fetchHolder();
                                updateProcessStatus({inProgress: false, loaded: true});
                                setActionError(undefined);
                            }
                            return;
                        }
                        throw response.Thrown;
                    } catch (e) {
                        apiLogger.error(caughtErrorMessage(logMessagePrefix), e);
                        updateProcessStatus({inProgress: false, loaded: true});
                        setActionError({type: 'receiveDelegationRequestFailed', error: toError(e)});
                    }
                },
                {queue: SHARED_PROMISE_QUEUE}
            ),
        [fetchHolder, receiveDelegationCall, setHolder, updateHolderFeature, updateProcessStatus]
    );

    const tryToRetryPrepareDelegation = useMemo(
        () =>
            reusePromiseWrapper(
                async () => {
                    const logMessagePrefix = `IdentityHolderProcessor.tryToRetryPrepareDelegation:`;
                    try {
                        updateProcessStatus({inProgress: true});

                        const response = await retryPrepareDelegationCall([], {logger: apiLogger, logMessagePrefix});
                        if (hasProperty(response, 'Ok')) {
                            setHolder(response.Ok.holder_information);
                            updateHolderFeature({
                                status: {inProgress: false, loaded: true},
                                error: {isError: false, error: undefined}
                            });
                            updateProcessStatus({inProgress: false, loaded: true});
                            setActionError(undefined);
                            return;
                        } else if (hasProperty(response, 'Err')) {
                            await fetchHolder();
                            updateProcessStatus({inProgress: false, loaded: true});
                            setActionError(undefined);
                            return;
                        }
                        throw response.Thrown;
                    } catch (e) {
                        apiLogger.error(caughtErrorMessage(logMessagePrefix), e);
                        updateProcessStatus({inProgress: false, loaded: true});
                        setActionError({type: 'retryPrepareDelegationFailed', error: toError(e)});
                    }
                },
                {queue: SHARED_PROMISE_QUEUE}
            ),
        [fetchHolder, retryPrepareDelegationCall, setHolder, updateHolderFeature, updateProcessStatus]
    );

    useEffect(() => {
        if (processInProgress) {
            return;
        }

        if (processingState.processing == 'automatic') {
            const type = processingState.action.type;
            switch (type) {
                case 'passDelegateToTheBackend': {
                    tryToPassDelegateToTheBackend(processingState.action.get_delegation_request);
                    return;
                }
                case 'retryPrepareDelegation': {
                    const sleepDelay = 15 * MILLIS_PER_SECOND;
                    const timerId = window.setTimeout(() => {
                        tryToRetryPrepareDelegation();
                    }, sleepDelay);
                    return () => {
                        window.clearTimeout(timerId);
                    };
                }
                default: {
                    const exhaustiveCheck: never = type;
                    applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                }
            }
        }
    }, [processInProgress, processingState, tryToPassDelegateToTheBackend, tryToRetryPrepareDelegation]);

    const value: Context = useMemo(
        () => ({
            automaticProcessingInProgress,
            processInProgress,
            processStatus,
            processingState
        }),
        [automaticProcessingInProgress, processInProgress, processStatus, processingState]
    );

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
