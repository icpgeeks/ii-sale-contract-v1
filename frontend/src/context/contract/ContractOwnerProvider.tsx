import {createContext, type PropsWithChildren, useContext, useMemo} from 'react';
import {useContractOwner} from './useContractOwner';

type Context = ReturnType<typeof useContractOwner>;

const Context = createContext<Context | undefined>(undefined);

export const useContractOwnerContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useContractOwnerContext must be used within a ContractOwnerProvider');
    }
    return context;
};

export const ContractOwnerProvider = (props: PropsWithChildren) => {
    const contractOwner = useContractOwner();
    const value = useMemo(() => contractOwner, [contractOwner]);
    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
