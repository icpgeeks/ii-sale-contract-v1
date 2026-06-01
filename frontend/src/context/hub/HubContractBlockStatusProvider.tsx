import type {Principal} from '@dfinity/principal';
import {nonNullish} from '@dfinity/utils';
import type {HubAnonymousCanister} from 'frontend/src/api/hub/HubCanister';
import {useICCanisterCallHubAnonymous} from 'frontend/src/api/hub/useICCallHub';
import type {ICHookReturn} from 'frontend/src/utils/ic/api/useICCallTypedFor';
import {createContext, useContext, useEffect, useMemo, type PropsWithChildren} from 'react';
import {apiLogger} from '../logger/logger';

type ContractBlockStatusContext = ICHookReturn<HubAnonymousCanister, 'getContractBlockStatus'>;
type Context = {
    hubContractBlockStatus: ContractBlockStatusContext;
};

const Context = createContext<Context | undefined>(undefined);
export const useHubContractBlockStatusContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useHubContractBlockStatusContextUnsafe must be used within a HubContractBlockStatusProvider');
    }
    return context;
};

type Props = {
    hubCanisterId: string | undefined;
    contractCanisterId: Principal | undefined;
};
export const HubContractBlockStatusProvider = (props: PropsWithChildren<Props>) => {
    const {hubCanisterId, contractCanisterId} = props;
    const hubContractBlockStatus = useICCanisterCallHubAnonymous(hubCanisterId, 'getContractBlockStatus');
    const {call: callContractBlockStatus} = hubContractBlockStatus;

    useEffect(() => {
        if (nonNullish(contractCanisterId)) {
            callContractBlockStatus(
                [
                    {
                        filter: {
                            ByContractCanisterId: {
                                canister_id: contractCanisterId
                            }
                        },
                        certified: false
                    }
                ],
                {logger: apiLogger, logMessagePrefix: `useHubContractBlockStatus:`}
            );
        }
    }, [hubCanisterId, contractCanisterId, callContractBlockStatus]);

    const value: Context = useMemo(() => ({hubContractBlockStatus}), [hubContractBlockStatus]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
