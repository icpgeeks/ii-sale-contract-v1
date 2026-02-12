import {createContext, type PropsWithChildren, useContext, useMemo} from 'react';
import {useContractCertificate} from './useContractCertificate';

type Context = ReturnType<typeof useContractCertificate>;
const Context = createContext<Context | undefined>(undefined);

export const useContractCertificateContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useContractCertificateContext must be used within a ContractCertificateProvider');
    }
    return context;
};

export const ContractCertificateProvider = (props: PropsWithChildren) => {
    const contractCertificate = useContractCertificate();
    const value = useMemo(() => contractCertificate, [contractCertificate]);
    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
