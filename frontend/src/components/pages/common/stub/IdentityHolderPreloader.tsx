import {isNullish} from '@dfinity/utils';
import {useCurrentCanisterIdContext} from 'frontend/src/context/canisterId/CurrentCanisterIdProvider';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useEffect} from 'react';

const originalTitle = document.title;

export const IdentityHolderPreloader = () => {
    const {currentCanisterId} = useCurrentCanisterIdContext();
    const {fetchHolder, identityNumber} = useIdentityHolderContext();

    useEffect(() => {
        if (isNullish(currentCanisterId)) {
            return;
        }
        fetchHolder();
    }, [fetchHolder, currentCanisterId]);

    useEffect(() => {
        if (isNullish(identityNumber)) {
            document.title = originalTitle;
        } else {
            document.title = `${identityNumber}`;
        }
    }, [identityNumber]);

    return null;
};
