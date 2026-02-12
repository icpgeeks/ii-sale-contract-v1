import {useMemo} from 'react';
import {useIdentityHolderContext} from '../../IdentityHolderProvider';
import {useIdentityHolderStateContext} from '../IdentityHolderStateProvider';

export const useOwnerCanStartCapture = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContext();
    const {
        feature: {
            status: {loaded}
        }
    } = useIdentityHolderContext();
    const {stateUnion} = useIdentityHolderStateContext();
    const isWaitingStartCaptureState = useMemo(() => stateUnion?.type == 'WaitingStartCapture', [stateUnion?.type]);

    return useMemo<boolean>(() => {
        if (!isOwnedByCurrentUser || !loaded) {
            return false;
        }
        return isWaitingStartCaptureState;
    }, [isOwnedByCurrentUser, loaded, isWaitingStartCaptureState]);
};
