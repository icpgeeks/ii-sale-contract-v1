import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useIdentityHolderContext} from '../identityHolder/IdentityHolderProvider';

export const usePotentialBuyerCanSendApproveTransactions = () => {
    const {isAuthenticated} = useAuthContext();
    const {isPotentialLoggedInBuyer} = useIdentityHolderContext();

    return isAuthenticated && isPotentialLoggedInBuyer;
};
