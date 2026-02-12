import {IndexCanister} from '@dfinity/ledger-icp';
import type {Principal} from '@dfinity/principal';
import {useAgentContext} from 'frontend/src/context/agent/AgentProvider';
import {useCallback, useMemo} from 'react';

type Context = {
    getICPIndexServiceAnonymous: (canisterId: Principal) => Promise<IndexCanister>;
};

export function useICPLedgerIndexService(): Context {
    const {getAnonymousAgent} = useAgentContext();

    /**
     * This service uses the ICP Ledger Index canister instead of IcrcIndexNGCanister because
     * it supports both legacy hex AccountIdentifier format and encoded ICRC account format.
     * This flexibility is needed to fetch ICP Ledger transactions by specific account regardless
     * of the account identifier format provided by the user.
     */
    const getICPIndexServiceAnonymous = useCallback(
        async (canisterId: Principal) => {
            const anonymousAgent = await getAnonymousAgent();
            return IndexCanister.create({agent: anonymousAgent, canisterId});
        },
        [getAnonymousAgent]
    );

    return useMemo<Context>(
        () => ({
            getICPIndexServiceAnonymous
        }),
        [getICPIndexServiceAnonymous]
    );
}
