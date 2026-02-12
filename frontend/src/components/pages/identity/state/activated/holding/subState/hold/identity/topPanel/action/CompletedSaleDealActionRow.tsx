import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {StartReleaseButton} from '../../../../../common/action/seller/startRelease/StartReleaseButton';

export const CompletedSaleDealActionRow = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    if (isOwnedByCurrentUser) {
        return <StartReleaseButton type="primary" />;
    }
    return null;
};
