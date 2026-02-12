import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {CompletedSaleDealIdentityPage} from '../../../common/identityPage/CompletedSaleDealIdentityPage';
import {UnsellablePage} from './UnsellablePage';

export const UnsellableRootComponent = () => {
    const {hasCompletedSaleDeal} = useIdentityHolderContextSafe();
    if (hasCompletedSaleDeal) {
        return <CompletedSaleDealIdentityPage />;
    }
    return <UnsellablePage />;
};
