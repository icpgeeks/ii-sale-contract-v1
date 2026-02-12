import type {GetAccountIdentifierTransactionsResponse} from '@dfinity/ledger-icp';
import type {GetTransactionsParams} from '@dfinity/ledger-icp/dist/types/index.params';
import {assertNonNullish} from '@dfinity/utils';
import {reusePromiseWrapper} from 'frontend/src/utils/core/promise/reusePromise';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {accountIdentifierToAccountVariantSafe, encodeAccountVariantSafe} from 'frontend/src/utils/ic/account';
import {safeCall} from 'frontend/src/utils/ic/api/safeCall';
import {MAINNET_INDEX_CANISTER_ID} from 'frontend/src/utils/ic/constants';
import {useMemo} from 'react';
import {apiLogger} from '../../logger/logger';
import {caughtErrorMessage} from '../../logger/loggerConstants';
import {useICPLedgerIndexService} from './useICPLedgerIndexService';

type Context = {
    fetchChunk: (parameters: GetTransactionsParams) => Promise<GetAccountIdentifierTransactionsResponse>;
};
export const useICPTransactions = () => {
    const {getICPIndexServiceAnonymous} = useICPLedgerIndexService();
    const fetchChunk = useMemo(
        () =>
            reusePromiseWrapper(async (parameters: GetTransactionsParams) => {
                const logMessagePrefix = 'useICPTransactions:';
                try {
                    const actor = await getICPIndexServiceAnonymous(MAINNET_INDEX_CANISTER_ID);
                    assertNonNullish(actor, 'noActor');

                    const call = safeCall(actor.getTransactions, {
                        logger: apiLogger,
                        logMessagePrefix,
                        argsToLog: [
                            {
                                accountIdentifier: encodeAccountVariantSafe(accountIdentifierToAccountVariantSafe(parameters.accountIdentifier)),
                                start: parameters.start,
                                maxResults: parameters.maxResults
                            }
                        ]
                    });
                    const response = await call(parameters);
                    if (hasProperty(response, 'Ok')) {
                        return response.Ok;
                    }
                    throw response.Thrown;
                } catch (e) {
                    apiLogger.error(caughtErrorMessage(logMessagePrefix), e);
                    throw e;
                }
            }),
        [getICPIndexServiceAnonymous]
    );

    return useMemo<Context>(() => ({fetchChunk}), [fetchChunk]);
};
