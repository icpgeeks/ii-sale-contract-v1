import {BannerEntryPoint} from 'frontend/src/components/pages/skeleton/banner/BannerEntryPoint';
import {SkeletonContentEntryPoint} from 'frontend/src/components/pages/skeleton/SkeletonContentEntryPoint';
import {SkeletonFooterEntryPoint} from 'frontend/src/components/pages/skeleton/SkeletonFooterEntryPoint';
import {SkeletonToolbarEntryPoint} from 'frontend/src/components/pages/skeleton/SkeletonToolbarEntryPoint';
import {PageLoaderComponent} from 'frontend/src/components/widgets/PageLoaderComponent';
import type {PropsWithChildren} from 'react';
import {useEffect} from 'react';
import {AgentProvider} from '../context/agent/AgentProvider';
import {AppConfigProvider} from '../context/AppConfigProvider';
import {AuthProvider, useAuthContext} from '../context/auth/AuthProvider';
import {CanisterProvider} from '../context/canister/CanisterProvider';
import {CurrentCanisterIdProvider, useCurrentCanisterIdContext} from '../context/canisterId/CurrentCanisterIdProvider';
import {ContractCertificateProvider} from '../context/certificate/ContractCertificateProvider';
import {DelegationExpirationLogger} from '../context/DelegationExpirationLogger';
import {FaviconMonitor} from '../context/favicon/FaviconMonitor';
import {CanisterStatusPreloader} from '../context/ic/canisterStatus/CanisterStatusPreloader';
import {CanisterStatusProvider} from '../context/ic/canisterStatus/CanisterStatusProvider';
import {IdentityHolderAutoFetcher} from '../context/identityHolder/IdentityHolderAutoFetcher';
import {IdentityHolderProcessor} from '../context/identityHolder/IdentityHolderProcessor';
import {IdentityHolderProvider} from '../context/identityHolder/IdentityHolderProvider';
import {IdentityHolderAssetsProvider} from '../context/identityHolder/state/holding/IdentityHolderAssetsProvider';
import {IdentityHolderLinkedAssetsProvider} from '../context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {IdentityHolderStateProvider} from '../context/identityHolder/state/IdentityHolderStateProvider';
import {apiLogger, authLogger} from '../context/logger/logger';
import {LoginNotificationHandler} from '../context/LoginNotificationHandler';
import {MediaThemeProvider} from '../context/mediaTheme/MediaThemeProvider';
import {useThemeTypeController} from '../context/mediaTheme/useMediaThemeTypeController';
import {useRedirectFromRaw} from '../hook/useRedirectFromRaw';
import {IS_DEV_ENVIRONMENT} from '../utils/env';
import {ConnectModalRenderer} from './pages/auth/ConnectModalRenderer';
import {ReferralTracker} from './pages/common/ReferralTracker';
import {ContractCertificatePreloader} from './pages/common/stub/ContractCertificatePreloader';
import {IdentityHolderPreloader} from './pages/common/stub/IdentityHolderPreloader';
import {TemporaryUIData} from './pages/common/TemporaryUIData';
import {ErrorBoundaryComponent} from './widgets/ErrorBoundaryComponent';

export const AppEntryPoint = () => {
    useRedirectFromRaw();
    return (
        <MediaThemeWrapper>
            <AuthProvider logger={authLogger}>
                <AgentProviderWrapper>
                    <LoginNotificationHandler />
                    <DelegationExpirationLogger />
                    <DataComponents>
                        <AppRootLayout />
                    </DataComponents>
                </AgentProviderWrapper>
            </AuthProvider>
        </MediaThemeWrapper>
    );
};

const MediaThemeWrapper = (props: PropsWithChildren) => {
    const {type, setType} = useThemeTypeController('system');
    return (
        <MediaThemeProvider type={type} onTypeChange={setType} darkClassName="gf-dark">
            <FaviconMonitor lightIconFileName="/favicon-64.svg" darkIconFileName="/favicon-64-dark.svg" />
            <AppConfigProvider>{props.children}</AppConfigProvider>
        </MediaThemeProvider>
    );
};

const AgentProviderWrapper = ({children}: PropsWithChildren) => {
    const {isReady, principal, accountIdentifierHex} = useAuthContext();
    const currentPrincipalText = principal?.toText() || 'anonymous';
    useEffect(() => {
        if (isReady) {
            authLogger.log('Current principal', currentPrincipalText);
            if (accountIdentifierHex != undefined) {
                authLogger.log('Current principal main subaccount', accountIdentifierHex);
            }
        }
    }, [principal, currentPrincipalText, isReady, accountIdentifierHex]);

    if (!isReady) {
        return <PageLoaderComponent />;
    }

    return (
        <AgentProvider isDevelopment={IS_DEV_ENVIRONMENT}>
            <CanisterProvider logger={apiLogger}>{children}</CanisterProvider>
        </AgentProvider>
    );
};

const DataComponents = (props: PropsWithChildren) => {
    return (
        <>
            <CurrentCanisterIdProvider>
                <CurrentCanisterStatusProviderWithPreloader>
                    <ContractCertificateProvider>
                        <ContractCertificatePreloader />
                        <IdentityHolderProvider>
                            <IdentityHolderPreloader />
                            <IdentityHolderStateProvider>
                                <TemporaryUIData />
                                <IdentityHolderAssetsProvider>
                                    <IdentityHolderLinkedAssetsProvider>
                                        <IdentityHolderProcessor>
                                            <IdentityHolderAutoFetcher />
                                            {props.children}
                                        </IdentityHolderProcessor>
                                    </IdentityHolderLinkedAssetsProvider>
                                </IdentityHolderAssetsProvider>
                            </IdentityHolderStateProvider>
                        </IdentityHolderProvider>
                    </ContractCertificateProvider>
                </CurrentCanisterStatusProviderWithPreloader>
            </CurrentCanisterIdProvider>
            <ConnectModalRenderer />
            <ReferralTracker />
        </>
    );
};

const AppRootLayout = () => {
    return (
        <div className="skStack">
            <div className="skToolbarRow">
                <ErrorBoundaryComponent childComponentName="Toolbar">
                    <SkeletonToolbarEntryPoint />
                </ErrorBoundaryComponent>
            </div>
            <ErrorBoundaryComponent childComponentName="Banner">
                <BannerEntryPoint />
            </ErrorBoundaryComponent>
            <div className="skContentRow">
                <ErrorBoundaryComponent childComponentName="Content">
                    <SkeletonContentEntryPoint />
                </ErrorBoundaryComponent>
            </div>
            <div className="skFooterRow">
                <ErrorBoundaryComponent childComponentName="Footer">
                    <SkeletonFooterEntryPoint />
                </ErrorBoundaryComponent>
            </div>
        </div>
    );
};

const CurrentCanisterStatusProviderWithPreloader = (props: PropsWithChildren) => {
    const {currentCanisterId} = useCurrentCanisterIdContext();
    return (
        <CanisterStatusProvider canisterId={currentCanisterId}>
            {props.children}
            <CanisterStatusPreloader />
        </CanisterStatusProvider>
    );
};
