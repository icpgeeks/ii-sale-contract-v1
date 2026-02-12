import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useIdentityHolderBuyerOffer} from './useIdentityHolderBuyerOffer';

export const useIdentityHolderCurrentUserBuyerOffer = () => {
    const {principal} = useAuthContext();
    return useIdentityHolderBuyerOffer(principal);
};
