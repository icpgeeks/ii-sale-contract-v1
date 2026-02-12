import {Flex} from 'antd';
import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import {IdentityHolderOffersProvider} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderOffersProvider';
import {AssetPanel} from '../../../common/assets/AssetPanel';
import {OfferPanel} from '../../../common/offers/OfferPanel';
import {TopPanel} from './topPanel/TopPanel';

export const IdentityPage = () => {
    return (
        <Flex vertical gap={16}>
            <ErrorBoundaryComponent childComponentName="TopPanel">
                <TopPanel />
            </ErrorBoundaryComponent>
            <ErrorBoundaryComponent childComponentName="OffersPanel">
                <IdentityHolderOffersProvider>
                    <OfferPanel />
                </IdentityHolderOffersProvider>
            </ErrorBoundaryComponent>
            <ErrorBoundaryComponent childComponentName="AssetPanel">
                <AssetPanel />
            </ErrorBoundaryComponent>
        </Flex>
    );
};
