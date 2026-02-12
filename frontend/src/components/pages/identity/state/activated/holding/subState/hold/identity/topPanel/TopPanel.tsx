import {Flex} from 'antd';
import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {RefreshHolderButton} from '../../../../../common/RefreshHolderButton';
import {HoldingPanelHeader} from '../../../../common/HoldingPanelHeader';
import {ActionRow} from './action/ActionRow';
import {BuyerPaymentAddress} from './address/BuyerPaymentAddress';
import {SellerPayoutAddress} from './address/SellerPayoutAddress';
import {CooldownStatusPanel} from './cooldown/CooldownStatusPanel';
import {HolderStatusRow} from './holderStatus/HolderStatusRow';
import {LastUpdated} from './lastUpdated/LastUpdated';
import {CurrentUserOffer} from './offer/CurrentUserOffer';
import {Price} from './price/Price';
import {HolderStats} from './stats/HolderStats';

export const TopPanel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <ErrorBoundaryComponent childComponentName="HeaderRow">
                    <Flex vertical gap={8}>
                        <Flex gap={16} justify="space-between">
                            <Flex gap={8} align="end" wrap>
                                <HoldingPanelHeader />
                                <LastUpdated />
                            </Flex>
                            <RefreshHolderButton />
                        </Flex>
                        <HolderStatusRow />
                    </Flex>
                </ErrorBoundaryComponent>
                <ErrorBoundaryComponent childComponentName="HolderStats">
                    <HolderStats />
                </ErrorBoundaryComponent>
                <ErrorBoundaryComponent childComponentName="Price">
                    <Price />
                </ErrorBoundaryComponent>
                <ErrorBoundaryComponent childComponentName="SellerPayoutAddress">
                    <SellerPayoutAddress />
                </ErrorBoundaryComponent>
                <ErrorBoundaryComponent childComponentName="CurrentUserOffer">
                    <CurrentUserOffer />
                </ErrorBoundaryComponent>
                <ErrorBoundaryComponent childComponentName="BuyerPaymentAddress">
                    <BuyerPaymentAddress />
                </ErrorBoundaryComponent>
                <ErrorBoundaryComponent childComponentName="CooldownStatusPanel">
                    <CooldownStatusPanel />
                </ErrorBoundaryComponent>
                <ErrorBoundaryComponent childComponentName="ActionRow">
                    <ActionRow />
                </ErrorBoundaryComponent>
            </Flex>
        </PanelCard>
    );
};
