import {nonNullish} from '@dfinity/utils';
import type {HubAnonymousCanister} from 'frontend/src/api/hub/HubCanister';
import {useICCanisterCallHubAnonymous} from 'frontend/src/api/hub/useICCallHub';
import type {ICHookReturn} from 'frontend/src/utils/ic/api/useICCallTypedFor';
import {createContext, useContext, useEffect, useMemo, type PropsWithChildren} from 'react';
import {apiLogger} from '../logger/logger';

type Context = ICHookReturn<HubAnonymousCanister, 'getContractTemplate'>;

const Context = createContext<Context | undefined>(undefined);
export const useHubContractTemplateContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useHubContractTemplateContextUnsafe must be used within a HubContractTemplateProvider');
    }
    return context;
};

type Props = {
    hubCanisterId: string | undefined;
    contractTemplateId: bigint | undefined;
};
export const HubContractTemplateProvider = (props: PropsWithChildren<Props>) => {
    const {hubCanisterId, contractTemplateId} = props;
    const hubContract = useICCanisterCallHubAnonymous(hubCanisterId, 'getContractTemplate');
    const {call} = hubContract;

    useEffect(() => {
        if (nonNullish(contractTemplateId)) {
            call([{contractTemplateId: contractTemplateId, certified: false}], {logger: apiLogger, logMessagePrefix: `useHubContract:`});
        }
    }, [hubCanisterId, contractTemplateId, call]);

    const value: Context = useMemo(() => hubContract, [hubContract]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
