import {isNullish} from '@dfinity/utils';
import type {DataAvailability} from 'frontend/src/utils/core/feature/feature';
import {useMemo} from 'react';
import type {CanisterCyclesState} from 'src/declarations/contract/contract.did';
import {useIdentityHolderContext} from './IdentityHolderProvider';

type CanisterCyclesDataAvailability = DataAvailability<{lowCyclesWarning: boolean; criticalCyclesWarning: boolean; state: CanisterCyclesState}>;
type Context = {
    dataAvailability: CanisterCyclesDataAvailability;
};
export const useCanisterCyclesState = () => {
    const {holder, feature} = useIdentityHolderContext();
    return useMemo<Context>(() => {
        if (!feature.status.loaded) {
            return {dataAvailability: {type: 'loading'}};
        }
        if (feature.error.isError || isNullish(holder)) {
            return {dataAvailability: {type: 'notAvailable'}};
        }
        const state = holder.canister_cycles_state;
        const lowCyclesWarning = state.current_cycles <= state.warning_threshold_cycles;
        const criticalCyclesWarning = state.current_cycles <= state.critical_threshold_cycles;

        return {
            dataAvailability: {
                type: 'available',
                lowCyclesWarning,
                criticalCyclesWarning,
                state
            }
        };
    }, [feature.error.isError, feature.status.loaded, holder]);
};
