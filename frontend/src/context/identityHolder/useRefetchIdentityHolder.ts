import {isNullish} from '@dfinity/utils';
import {useEffect, useState} from 'react';
import {useCurrentCanisterIdContext} from '../canisterId/CurrentCanisterIdProvider';
import {useIdentityHolderContext} from './IdentityHolderProvider';

export const useRefetchIdentityHolder = () => {
    const {currentCanisterId} = useCurrentCanisterIdContext();

    const {fetchHolder} = useIdentityHolderContext();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (isNullish(currentCanisterId)) {
            return;
        }
        const fetch = async () => {
            await fetchHolder();
            setLoaded(true);
        };
        fetch();
    }, [fetchHolder, currentCanisterId]);

    return loaded;
};
