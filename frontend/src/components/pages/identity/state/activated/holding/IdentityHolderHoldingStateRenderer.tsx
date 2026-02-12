import {IdentityHolderIllegalStatePanel} from 'frontend/src/components/pages/common/stub/IdentityHolderIllegalStatePanel';
import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import type {HolderHoldingSubStateUnionType} from 'frontend/src/context/identityHolder/identityHolderStateUtils';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {memo, useMemo, type ComponentType} from 'react';
import {CancelSaleDealRootComponent} from './subState/cancelSaleDeal/CancelSaleDealRootComponent';
import {CheckAssetsRootComponent} from './subState/checkAssets/CheckAssetsRootComponent';
import {FetchAssetsRootComponent} from './subState/fetchAssets/FetchAssetsRootComponent';
import {IdentityHolderHoldingStateRootComponent} from './subState/hold/IdentityHolderHoldingStateRootComponent';
import {StartHoldingPage} from './subState/startHolding/StartHoldingPage';
import {UnsellableRootComponent} from './subState/unsellable/UnsellableRootComponent';
import {ValidateAssetsRootComponent} from './subState/validateAssets/ValidateAssetsRootComponent';

export const IdentityHolderHoldingStateRenderer = () => {
    const {getStateUnion} = useIdentityHolderStateContext();
    const holdingStateUnion = useMemo(() => getStateUnion('Holding'), [getStateUnion]);
    return (
        <ErrorBoundaryComponent childComponentName={`${holdingStateUnion?.type ?? 'Unknown'}Page`}>
            <PageComponent type={holdingStateUnion?.type} />
        </ErrorBoundaryComponent>
    );
};

const PageComponent = (props: {type: HolderHoldingSubStateUnionType | undefined}) => {
    const Component = useMemo(() => getComponentForState(props.type), [props.type]);
    // eslint-disable-next-line react-hooks/static-components
    return <Component />;
};

function getComponentForState(type?: HolderHoldingSubStateUnionType): ComponentType {
    const Component = pages[type as HolderHoldingSubStateUnionType];
    return Component ?? IdentityHolderIllegalStatePanel;
}

const pages: Record<HolderHoldingSubStateUnionType, ComponentType> = {
    StartHolding: memo(StartHoldingPage),
    FetchAssets: memo(FetchAssetsRootComponent),
    CheckAssets: memo(CheckAssetsRootComponent),
    Hold: memo(IdentityHolderHoldingStateRootComponent),
    ValidateAssets: memo(ValidateAssetsRootComponent),
    Unsellable: memo(UnsellableRootComponent),
    CancelSaleDeal: memo(CancelSaleDealRootComponent)
};
