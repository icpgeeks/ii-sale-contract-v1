import {isNullish} from '@dfinity/utils';
import {useCurrentCanisterIdContext} from 'frontend/src/context/canisterId/CurrentCanisterIdProvider';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import type {PropsWithChildren, ReactNode} from 'react';
import {Navigate, Route, Routes} from 'react-router';
import {ErrorBoundaryComponent} from '../../widgets/ErrorBoundaryComponent';
import {AboutEntryPoint} from '../about/AboutEntryPoint';
import {ContractCertificateLoadingErrorPanel} from '../common/stub/ContractCertificateLoadingErrorPanel';
import {CurrentCanisterIdLoadingErrorPanel} from '../common/stub/CurrentCanisterIdLoadingErrorPanel';
import {CurrentCanisterIdLoadingPanel} from '../common/stub/CurrentCanisterIdLoadingPanel';
import {CurrentCanisterIdNotFoundPanel} from '../common/stub/CurrentCanisterIdNotFoundPanel';
import {IdentityHolderLoadingErrorPanel} from '../common/stub/IdentityHolderLoadingErrorPanel';
import {IdentityHolderLoadingPanel} from '../common/stub/IdentityHolderLoadingPanel';
import {IdentityEntryPoint} from '../identity/IdentityEntryPoint';
import {SettingsEntryPoint} from '../settings/SettingsEntryPoint';
import {StatusEntryPoint} from '../status/StatusEntryPoint';
import {PATH_ABOUT, PATH_HOME, PATH_SETTINGS, PATH_STATUS} from './Router';

export const SkeletonContentEntryPoint = () => {
    return (
        <Routes>
            <Route
                path={PATH_HOME}
                element={
                    <RouteContentWrapper childComponentName="Home">
                        <IdentityEntryPoint />
                    </RouteContentWrapper>
                }
            />
            <Route
                path={`${PATH_STATUS}/*`}
                element={
                    <RouteContentWrapper childComponentName="Status" requireCertificateInformation={false} requireHolderInformation={false}>
                        <StatusEntryPoint />
                    </RouteContentWrapper>
                }
            />
            <Route
                path={PATH_SETTINGS}
                element={
                    <RouteContentWrapper childComponentName="Settings">
                        <SettingsEntryPoint />
                    </RouteContentWrapper>
                }
            />
            <Route
                path={PATH_ABOUT}
                element={
                    <RouteContentWrapper childComponentName="About" requireCertificateInformation={false} requireHolderInformation={false}>
                        <AboutEntryPoint />
                    </RouteContentWrapper>
                }
            />
            <Route path="*" element={<Navigate to={PATH_HOME} />} />
        </Routes>
    );
};

const RouteContentWrapper = (
    props: PropsWithChildren<{
        childComponentName: string;
        requireCanisterId?: boolean;
        requireCertificateInformation?: boolean;
        requireHolderInformation?: boolean;
    }>
) => {
    const {childComponentName, requireCanisterId = true, requireCertificateInformation = true, requireHolderInformation = true} = props;
    const currentCanisterIdContext = useCurrentCanisterIdContext();
    const contractCertificateContext = useContractCertificateContext();
    const identityHolderContext = useIdentityHolderContext();

    let child: ReactNode = null;
    if (requireCanisterId) {
        if (!currentCanisterIdContext.feature.status.loaded) {
            child = <CurrentCanisterIdLoadingPanel />;
        } else if (currentCanisterIdContext.feature.error.isError) {
            child = <CurrentCanisterIdLoadingErrorPanel />;
        } else if (isNullish(currentCanisterIdContext.currentCanister)) {
            child = <CurrentCanisterIdNotFoundPanel />;
        }
    }

    if (isNullish(child) && requireCertificateInformation) {
        if (!contractCertificateContext.feature.status.loaded) {
            child = <IdentityHolderLoadingPanel />;
        } else if (contractCertificateContext.feature.error.isError) {
            child = <ContractCertificateLoadingErrorPanel />;
        } else if (isNullish(contractCertificateContext.contractCertificate)) {
            child = <ContractCertificateLoadingErrorPanel />;
        }
    }

    if (isNullish(child) && requireHolderInformation) {
        if (!identityHolderContext.feature.status.loaded) {
            child = <IdentityHolderLoadingPanel />;
        } else if (identityHolderContext.feature.error.isError) {
            child = <IdentityHolderLoadingErrorPanel />;
        } else if (isNullish(identityHolderContext.holder)) {
            child = <IdentityHolderLoadingErrorPanel />;
        }
    }

    if (isNullish(child)) {
        child = props.children;
    }

    return <ErrorBoundaryComponent childComponentName={childComponentName}>{child}</ErrorBoundaryComponent>;
};
