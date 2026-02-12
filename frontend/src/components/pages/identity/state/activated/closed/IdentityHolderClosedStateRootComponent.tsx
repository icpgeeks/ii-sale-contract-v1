import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {CompletedSaleDealIdentityPage} from '../common/identityPage/CompletedSaleDealIdentityPage';
import {IdentityHolderClosedStatePage} from './owner/IdentityHolderClosedStatePage';

export const IdentityHolderClosedStateRootComponent = () => {
    const {hasCompletedSaleDeal} = useIdentityHolderContext();
    if (hasCompletedSaleDeal) {
        return <CompletedSaleDealIdentityPage />;
    }
    return <IdentityHolderClosedStatePage />;
};
