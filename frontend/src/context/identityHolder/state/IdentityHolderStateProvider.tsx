import type {PropsWithChildren} from 'react';
import {createContext, useCallback, useContext, useMemo} from 'react';
import {getSingleEntryUnion, hasProperty, type TransformUnion} from '../../../utils/core/typescript/typescriptAddons';
import {useIdentityHolderContext} from '../IdentityHolderProvider';
import type {ExtractHolderSubStates, ExtractHolderSubStateUnionKeys, HolderStateUnion} from '../identityHolderStateUtils';

type StateToSubStateMapping = ExtractHolderSubStates<'WaitingActivation' | 'Capture' | 'Holding' | 'Release'>;
type StateKeys = keyof StateToSubStateMapping;
type StateToSubStateUnionKeys = ExtractHolderSubStateUnionKeys<StateKeys>;

type GetStateSubState = <T extends StateKeys>(stateType: T) => StateToSubStateMapping[T] | undefined;
type GetStateUnion = <T extends StateKeys>(stateType: T) => TransformUnion<StateToSubStateMapping[T]> | undefined;
type ExtractSubState<T extends StateKeys, K extends StateToSubStateUnionKeys[T]> = Extract<TransformUnion<StateToSubStateMapping[T]>, {type: K}>['state'];
type GetSubStateValue = <T extends StateKeys, K extends StateToSubStateUnionKeys[T]>(stateType: T, subStateKey: K) => ExtractSubState<T, K> | undefined;

type Context = {
    stateUnion: HolderStateUnion | undefined;
    getStateSubState: GetStateSubState;
    getStateUnion: GetStateUnion;
    getSubStateValue: GetSubStateValue;
};

const Context = createContext<Context | undefined>(undefined);
export const useIdentityHolderStateContext = () => {
    const context = useContext<Context | undefined>(Context);
    if (!context) {
        throw new Error('useIdentityHolderStateContext must be used within a IdentityHolderStateProvider');
    }
    return context;
};

export const IdentityHolderStateProvider = (props: PropsWithChildren) => {
    const {holder} = useIdentityHolderContext();
    const stateUnion: HolderStateUnion | undefined = useMemo(() => getSingleEntryUnion(holder?.state), [holder?.state]);

    const getStateSubState = useCallback<GetStateSubState>(
        (stateType) => {
            if (stateUnion == undefined || stateUnion.type != stateType) {
                return undefined;
            }
            if (stateUnion.state == undefined) {
                return undefined;
            }
            if (hasProperty(stateUnion.state, 'sub_state')) {
                return stateUnion.state.sub_state as StateToSubStateMapping[typeof stateType];
            }
            return undefined;
        },
        [stateUnion]
    );

    const getStateUnion = useCallback<GetStateUnion>(
        (stateType) => {
            const stateSubState = getStateSubState(stateType);
            return getSingleEntryUnion(stateSubState) as TransformUnion<StateToSubStateMapping[typeof stateType]>;
        },
        [getStateSubState]
    );

    const getSubStateValue = useCallback<GetSubStateValue>(
        (stateType, subStateKey) => {
            const union = getStateUnion(stateType);
            if (union == undefined || union.type != subStateKey) {
                return undefined;
            }
            return union.state;
        },
        [getStateUnion]
    );

    const value: Context = useMemo(() => ({stateUnion, getStateSubState, getStateUnion, getSubStateValue}), [stateUnion, getStateSubState, getStateUnion, getSubStateValue]);
    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
