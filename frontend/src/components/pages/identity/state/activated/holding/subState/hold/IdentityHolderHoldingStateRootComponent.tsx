import {IdentityHolderHoldingHoldSubStateSaleDealStateProvider} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderHoldingHoldSubStateSaleDealStateProvider';
import {IdentityRootComponent} from './identity/IdentityRootComponent';

export const IdentityHolderHoldingStateRootComponent = () => {
    return (
        <IdentityHolderHoldingHoldSubStateSaleDealStateProvider>
            <IdentityRootComponent />
        </IdentityHolderHoldingHoldSubStateSaleDealStateProvider>
    );
};
