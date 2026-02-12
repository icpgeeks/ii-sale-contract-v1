import {IdentityHolderIllegalStatePanel} from 'frontend/src/components/pages/common/stub/IdentityHolderIllegalStatePanel';
import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import type {HolderCaptureSubStateUnionType} from 'frontend/src/context/identityHolder/identityHolderStateUtils';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {memo, useMemo, type ComponentType} from 'react';
import {CaptureFailedPage} from './subState/captureFailed/CaptureFailedPage';
import {CreateEcdsaKeyPanel} from './subState/createEcdsaKey/CreateEcdsaKeyPanel';
import {DeletingIdentityAuthnMethodsPanel} from './subState/deletingIdentityAuthnMethods/DeletingIdentityAuthnMethodsPanel';
import {ExitAndRegisterHolderAuthnMethodPage} from './subState/exitAndRegisterHolderAuthnMethod/ExitAndRegisterHolderAuthnMethodPage';
import {FinishCapturePanel} from './subState/finishCapture/FinishCapturePanel';
import {GetHolderContractPrincipalPanel} from './subState/getHolderContractPrincipal/GetHolderContractPrincipalPanel';
import {NeedConfirmAuthnMethodSessionRegistrationPage} from './subState/needConfirmAuthnMethodSessionRegistration/NeedConfirmAuthnMethodSessionRegistrationPage';
import {NeedDeleteProtectedIdentityAuthnMethodPage} from './subState/needDeleteProtectedIdentityAuthnMethod/NeedDeleteProtectedIdentityAuthnMethodPage';
import {RegisterAuthnMethodSessionPanel} from './subState/registerAuthnMethodSession/RegisterAuthnMethodSessionPanel';
import {StartCapturePanel} from './subState/startCapture/StartCapturePanel';

export const IdentityHolderCaptureStateRenderer = () => {
    const {getStateUnion} = useIdentityHolderStateContext();
    const captureStateUnion = useMemo(() => getStateUnion('Capture'), [getStateUnion]);
    return (
        <ErrorBoundaryComponent childComponentName={`${captureStateUnion?.type ?? 'Unknown'}Page`}>
            <PageComponent type={captureStateUnion?.type} />
        </ErrorBoundaryComponent>
    );
};

const PageComponent = (props: {type: HolderCaptureSubStateUnionType | undefined}) => {
    const Component = useMemo(() => getComponentForState(props.type), [props.type]);
    // eslint-disable-next-line react-hooks/static-components
    return <Component />;
};

function getComponentForState(type?: HolderCaptureSubStateUnionType): ComponentType {
    const Component = pages[type as HolderCaptureSubStateUnionType];
    return Component ?? IdentityHolderIllegalStatePanel;
}

const pages: Record<HolderCaptureSubStateUnionType, ComponentType> = {
    StartCapture: memo(StartCapturePanel),
    CreateEcdsaKey: memo(CreateEcdsaKeyPanel),
    RegisterAuthnMethodSession: memo(RegisterAuthnMethodSessionPanel),
    NeedConfirmAuthnMethodSessionRegistration: memo(NeedConfirmAuthnMethodSessionRegistrationPage),
    ExitAndRegisterHolderAuthnMethod: memo(ExitAndRegisterHolderAuthnMethodPage),
    GetHolderContractPrincipal: memo(GetHolderContractPrincipalPanel),
    ObtainingIdentityAuthnMethods: memo(DeletingIdentityAuthnMethodsPanel),
    DeletingIdentityAuthnMethods: memo(DeletingIdentityAuthnMethodsPanel),
    NeedDeleteProtectedIdentityAuthnMethod: memo(NeedDeleteProtectedIdentityAuthnMethodPage),
    FinishCapture: memo(FinishCapturePanel),
    CaptureFailed: memo(CaptureFailedPage)
};
