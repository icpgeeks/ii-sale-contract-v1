import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {ActionRowGuest} from './ActionRowGuest';
import {ActionRowOwner} from './ActionRowOwner';

export const ActionRow = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const saleStatus = useIdentityHolderSaleStatus();

    if (saleStatus.type == 'sold') {
        return null;
    }

    if (isOwnedByCurrentUser) {
        return <ActionRowOwner />;
    }
    return <ActionRowGuest />;
};
