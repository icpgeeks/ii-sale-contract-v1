import {isNullish} from '@dfinity/utils';
import {useEffect} from 'react';
import {useCurrentCanisterIdContext} from '../../canisterId/CurrentCanisterIdProvider';
import {useCanisterStatusContext} from './CanisterStatusProvider';

export const CanisterStatusPreloader = () => {
    const {currentCanisterId} = useCurrentCanisterIdContext();
    const {
        canisterStatus: {fetchCanisterStatus}
    } = useCanisterStatusContext();

    useEffect(() => {
        if (isNullish(currentCanisterId)) {
            return;
        }
        fetchCanisterStatus();
    }, [fetchCanisterStatus, currentCanisterId]);

    return null;
};
