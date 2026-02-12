import {IdentityHolderIllegalStatePanel} from 'frontend/src/components/pages/common/stub/IdentityHolderIllegalStatePanel';
import {IdentityHolderNoListingPanel} from 'frontend/src/components/pages/common/stub/IdentityHolderNoListingPanel';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderHoldingHoldSubStateSaleDealStateContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderHoldingHoldSubStateSaleDealStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {useMemo} from 'react';
import {AcceptRootComponent} from '../subState/accept/AcceptRootComponent';
import {IdentityPage} from './IdentityPage';

type Component = 'noListing' | 'identityPage' | 'acceptRootComponent';
export const IdentityRootComponent = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const {state} = useIdentityHolderHoldingHoldSubStateSaleDealStateContext();

    const component: Component = useMemo<Component>(() => {
        if (isOwnedByCurrentUser) {
            if (state?.type == 'Accept') {
                return 'acceptRootComponent';
            }
            return 'identityPage';
        }

        if (state?.type == 'Trading') {
            return 'identityPage';
        }

        if (state?.type == 'Accept') {
            return 'acceptRootComponent';
        }

        return 'noListing';
    }, [isOwnedByCurrentUser, state?.type]);

    switch (component) {
        case 'noListing':
            return <IdentityHolderNoListingPanel />;
        case 'identityPage':
            return <IdentityPage />;
        case 'acceptRootComponent':
            return <AcceptRootComponent />;
        default: {
            const exhaustiveCheck: never = component;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return <IdentityHolderIllegalStatePanel />;
        }
    }
};
