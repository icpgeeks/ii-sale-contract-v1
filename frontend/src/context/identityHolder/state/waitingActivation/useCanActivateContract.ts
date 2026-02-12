import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useMemo} from 'react';
import {useIdentityHolderContext} from '../../IdentityHolderProvider';
import {useIdentityHolderStateContext} from '../IdentityHolderStateProvider';

export const useCanActivateContract = () => {
    const {isAuthenticated} = useAuthContext();
    const {
        feature: {
            status: {loaded}
        }
    } = useIdentityHolderContext();
    const {stateUnion} = useIdentityHolderStateContext();
    const isWaitingActivationState = useMemo(() => stateUnion?.type == 'WaitingActivation', [stateUnion?.type]);
    return useMemo<boolean>(() => {
        if (!isAuthenticated || !loaded) {
            return false;
        }
        return isWaitingActivationState;
    }, [isAuthenticated, loaded, isWaitingActivationState]);
};
