import {fromNullable, isNullish} from '@dfinity/utils';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {type TransformUnion, getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import type {PropsWithChildren} from 'react';
import {createContext, useContext, useMemo} from 'react';
import type {SaleDealState} from 'src/declarations/contract/contract.did';

type SaleDealStateUnion = TransformUnion<SaleDealState>;

type Context = {
    state: SaleDealStateUnion | undefined;
};

const Context = createContext<Context | undefined>(undefined);
export const useIdentityHolderHoldingHoldSubStateSaleDealStateContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityHolderHoldingHoldSubStateSaleDealStateContext must be used within a IdentityHolderHoldingHoldSubStateSaleDealStateProvider');
    }
    return context;
};

export const IdentityHolderHoldingHoldSubStateSaleDealStateProvider = (props: PropsWithChildren) => {
    const {getSubStateValue} = useIdentityHolderStateContext();

    const state: SaleDealStateUnion | undefined = useMemo(() => {
        const subState = getSubStateValue('Holding', 'Hold');
        if (isNullish(subState)) {
            return undefined;
        }
        return getSingleEntryUnion(fromNullable(subState.sale_deal_state));
    }, [getSubStateValue]);
    const value: Context = useMemo(() => ({state}), [state]);

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
