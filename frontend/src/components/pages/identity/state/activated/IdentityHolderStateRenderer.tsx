import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import type {HolderStateUnionType} from 'frontend/src/context/identityHolder/identityHolderStateUtils';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {memo, useMemo, type ComponentType} from 'react';
import {IdentityHolderIllegalStatePanel} from '../../../common/stub/IdentityHolderIllegalStatePanel';
import {IdentityHolderCaptureStateRootComponent} from './capture/IdentityHolderCaptureStateRootComponent';
import {IdentityHolderClosedStateRootComponent} from './closed/IdentityHolderClosedStateRootComponent';
import {IdentityHolderHoldingStateRenderer} from './holding/IdentityHolderHoldingStateRenderer';
import {IdentityHolderReleaseStateRootComponent} from './release/IdentityHolderReleaseStateRootComponent';
import {IdentityHolderWaitingStartCaptureStateRootComponent} from './waitingStartCapture/IdentityHolderWaitingStartCaptureStateRootComponent';

export const IdentityHolderStateRenderer = () => {
    const {stateUnion} = useIdentityHolderStateContext();
    const Component = useMemo(() => getComponentForState(stateUnion?.type), [stateUnion?.type]);
    // eslint-disable-next-line react-hooks/static-components
    return <Component />;
};

function getComponentForState(type?: HolderStateUnionType): ComponentType {
    const Component = pages[type as HolderStateUnionType];
    return Component ?? IdentityHolderIllegalStatePanel;
}

const pages: Record<HolderStateUnionType, ComponentType> = {
    WaitingStartCapture: memo(() => (
        <ErrorBoundaryComponent childComponentName="IdentityHolderWaitingStartCaptureStateRootComponent" logger={applicationLogger}>
            <IdentityHolderWaitingStartCaptureStateRootComponent />
        </ErrorBoundaryComponent>
    )),
    Capture: memo(() => (
        <ErrorBoundaryComponent childComponentName="IdentityHolderCaptureStateRootComponent" logger={applicationLogger}>
            <IdentityHolderCaptureStateRootComponent />
        </ErrorBoundaryComponent>
    )),
    Holding: memo(() => (
        <ErrorBoundaryComponent childComponentName="IdentityHolderHoldingStateRootComponent" logger={applicationLogger}>
            <IdentityHolderHoldingStateRenderer />
        </ErrorBoundaryComponent>
    )),
    Release: memo(() => (
        <ErrorBoundaryComponent childComponentName="IdentityHolderReleaseStateRootComponent" logger={applicationLogger}>
            <IdentityHolderReleaseStateRootComponent />
        </ErrorBoundaryComponent>
    )),
    Closed: memo(() => (
        <ErrorBoundaryComponent childComponentName="IdentityHolderClosedStateRootComponent" logger={applicationLogger}>
            <IdentityHolderClosedStateRootComponent />
        </ErrorBoundaryComponent>
    )),
    WaitingActivation: memo(IdentityHolderIllegalStatePanel)
};
