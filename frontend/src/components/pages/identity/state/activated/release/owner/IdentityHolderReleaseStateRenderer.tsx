import {IdentityHolderIllegalStatePanel} from 'frontend/src/components/pages/common/stub/IdentityHolderIllegalStatePanel';
import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import type {HolderReleaseSubStateUnionType} from 'frontend/src/context/identityHolder/identityHolderStateUtils';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {memo, useMemo, type ComponentType} from 'react';
import {CheckingAccessFromOwnerAuthnMethodPage} from './subState/checkingAccessFromOwnerAuthnMethod/CheckingAccessFromOwnerAuthnMethodPage';
import {ConfirmAuthnMethodRegistrationPanel} from './subState/confirmAuthnMethodRegistration/ConfirmAuthnMethodRegistrationPanel';
import {DangerousToLoseIdentityPage} from './subState/dangerousToLoseIdentity/DangerousToLoseIdentityPage';
import {DeleteHolderAuthnMethodPanel} from './subState/deleteHolderAuthnMethod/DeleteHolderAuthnMethodPanel';
import {EnsureOrphanedRegistrationExitedPanel} from './subState/ensureOrphanedRegistrationExited/EnsureOrphanedRegistrationExitedPanel';
import {EnterAuthnMethodRegistrationModePanel} from './subState/enterAuthnMethodRegistrationMode/EnterAuthnMethodRegistrationModePanel';
import {IdentityAPIChangedPage} from './subState/identityAPIChanged/IdentityAPIChangedPage';
import {ReleaseFailedPage} from './subState/releaseFailed/ReleaseFailedPage';
import {StartReleasePanel} from './subState/startRelease/StartReleasePanel';
import {WaitingAuthnMethodRegistrationPage} from './subState/waitingAuthnMethodRegistration/WaitingAuthnMethodRegistrationPage';

export const IdentityHolderReleaseStateRenderer = () => {
    const {getStateUnion} = useIdentityHolderStateContext();
    const releaseStateUnion = useMemo(() => getStateUnion('Release'), [getStateUnion]);
    return (
        <ErrorBoundaryComponent childComponentName={`${releaseStateUnion?.type ?? 'Unknown'}Page`}>
            <PageComponent type={releaseStateUnion?.type} />
        </ErrorBoundaryComponent>
    );
};

const PageComponent = (props: {type: HolderReleaseSubStateUnionType | undefined}) => {
    const Component = useMemo(() => getComponentForState(props.type), [props.type]);
    // eslint-disable-next-line react-hooks/static-components
    return <Component />;
};

function getComponentForState(type?: HolderReleaseSubStateUnionType): ComponentType {
    const Component = pages[type as HolderReleaseSubStateUnionType];
    return Component ?? IdentityHolderIllegalStatePanel;
}

const pages: Record<HolderReleaseSubStateUnionType, ComponentType> = {
    StartRelease: memo(StartReleasePanel),
    EnterAuthnMethodRegistrationMode: memo(EnterAuthnMethodRegistrationModePanel),
    WaitingAuthnMethodRegistration: memo(WaitingAuthnMethodRegistrationPage),
    ConfirmAuthnMethodRegistration: memo(ConfirmAuthnMethodRegistrationPanel),
    CheckingAccessFromOwnerAuthnMethod: memo(CheckingAccessFromOwnerAuthnMethodPage),
    DangerousToLoseIdentity: memo(DangerousToLoseIdentityPage),
    IdentityAPIChanged: memo(IdentityAPIChangedPage),
    DeleteHolderAuthnMethod: memo(DeleteHolderAuthnMethodPanel),
    EnsureOrphanedRegistrationExited: memo(EnsureOrphanedRegistrationExitedPanel),
    ReleaseFailed: memo(ReleaseFailedPage)
};
