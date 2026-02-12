import {useDeleteHolderAuthnMethod} from 'frontend/src/context/identityHolder/state/release/useDeleteHolderAuthnMethod';
import {useOwnerCanDeleteHolderAuthnMethod} from 'frontend/src/context/identityHolder/state/release/useOwnerCanDeleteHolderAuthnMethod';
import {createContext, useContext, useMemo, type PropsWithChildren} from 'react';

type Context = {
    deleteHolderAuthnMethod: ReturnType<typeof useDeleteHolderAuthnMethod>;
    ownerCanDeleteHolderAuthnMethod: boolean;
};

const Context = createContext<Context | undefined>(undefined);
export const useDeleteHolderAuthnMethodDataContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useDeleteHolderAuthnMethodDataContext must be used within a DeleteHolderAuthnMethodDataProvider');
    }
    return context;
};

export const DeleteHolderAuthnMethodDataProvider = (props: PropsWithChildren) => {
    const ownerCanDeleteHolderAuthnMethod = useOwnerCanDeleteHolderAuthnMethod();
    const deleteHolderAuthnMethod = useDeleteHolderAuthnMethod();
    const value = useMemo<Context>(() => {
        return {
            deleteHolderAuthnMethod,
            ownerCanDeleteHolderAuthnMethod
        };
    }, [deleteHolderAuthnMethod, ownerCanDeleteHolderAuthnMethod]);

    if (!ownerCanDeleteHolderAuthnMethod) {
        return null;
    }

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
