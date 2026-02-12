import {Cbor, httpHeadersTransform, type QueryResponse} from '@dfinity/agent';
import {trimIfDefined} from '../../core/string/string';
import {hasProperty} from '../../core/typescript/typescriptAddons';
import {IS_DEV_ENVIRONMENT} from '../../env';
import type {Logger} from '../../logger/Logger';
import {IC_API_HOST, LOCAL_REPLICA_API_HOST} from '../constants';
import {safeCall} from './safeCall';

export const makeQueryRequestWithPresignedEnvelope = async (
    parameters: {
        canisterId: string;
        body: Uint8Array | Array<number>;
    },
    options: {
        logger?: Logger;
        logMessagePrefix?: string;
    }
): Promise<Uint8Array> => {
    const {canisterId} = parameters;
    const body = new Uint8Array(parameters.body);
    const {logger, logMessagePrefix: _logMessagePrefix} = options;

    const urlBase = IS_DEV_ENVIRONMENT ? LOCAL_REPLICA_API_HOST : IC_API_HOST;
    const fetchURL = new URL(`/api/v2/canister/${canisterId}/query`, urlBase);

    const logMessagePrefix = trimIfDefined(_logMessagePrefix) ?? '';

    const call = safeCall(fetch, {logger, logMessagePrefix, argsToLog: [{fetchURL, bodyLength: body.length, body}]});
    const response = await call(fetchURL, {
        method: 'POST',
        headers: {'Content-Type': 'application/cbor'},
        body
    });
    if (hasProperty(response, 'Thrown')) {
        throw response.Thrown;
    }
    const fetchResponse = response.Ok;

    logger?.debug(`${logMessagePrefix} fetchResponse.status`, {
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers: httpHeadersTransform(fetchResponse.headers)
    });

    if (fetchResponse.status != 200) {
        const errorMessage = `Gateway returned an error:\n` + `  Code: ${fetchResponse.status} (${fetchResponse.statusText})\n` + `  Body: ${await fetchResponse.text()}\n`;
        throw new Error(errorMessage);
    }

    const queryResponse: QueryResponse = Cbor.decode(await fetchResponse.bytes());
    logger?.debug(`${logMessagePrefix} cbor decoded queryResponse`, {queryResponse});
    if (!hasProperty(queryResponse, 'reply')) {
        const errorMessage = `Query response rejected:\n  Status: ${queryResponse.status}\n  Reject Code: ${queryResponse.reject_code}\n  Reject Message: ${queryResponse.reject_message}\n  Error Code: ${queryResponse.error_code}`;
        throw new Error(errorMessage);
    }

    const responseBody = queryResponse.reply.arg;
    logger?.debug(`${logMessagePrefix} responseBody`, {responseBodyLength: responseBody.byteLength, responseBody});
    return responseBody;
};
