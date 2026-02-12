import {isNullish} from '@dfinity/utils';
import {useIdentityHolderContext, useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {useMemo} from 'react';
import {IdentityHolderCaptureStateGuestPage} from '../capture/guest/IdentityHolderCaptureStateGuestPage';
import {CompletedSaleDealIdentityPage} from '../common/identityPage/CompletedSaleDealIdentityPage';
import {IdentityHolderReleaseStateGuestPage} from './guest/IdentityHolderReleaseStateGuestPage';
import {IdentityHolderReleaseStateRenderer} from './owner/IdentityHolderReleaseStateRenderer';

export const IdentityHolderReleaseStateRootComponent = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    if (isOwnedByCurrentUser) {
        return <IdentityHolderReleaseStateRenderer />;
    }
    return <GuestComponent />;
};

const GuestComponent = () => {
    const {hasCompletedSaleDeal} = useIdentityHolderContext();
    const {stateUnion} = useIdentityHolderStateContext();
    const releaseInitiation = useMemo(() => {
        if (stateUnion?.type == 'Release') {
            return stateUnion.state.release_initiation;
        }
        return undefined;
    }, [stateUnion]);

    if (hasCompletedSaleDeal) {
        return <CompletedSaleDealIdentityPage />;
    }
    if (isNullish(releaseInitiation) || hasProperty(releaseInitiation, 'Manual')) {
        return <IdentityHolderReleaseStateGuestPage />;
    }
    return <IdentityHolderCaptureStateGuestPage />;
};
