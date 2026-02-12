import {Flex} from 'antd';
import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {RefreshHolderButton} from '../../identity/state/activated/common/RefreshHolderButton';
import {AssetPanel} from '../../identity/state/activated/holding/common/assets/AssetPanel';
import {HoldingPanelHeader} from '../../identity/state/activated/holding/common/HoldingPanelHeader';
import {ActionRow} from '../../identity/state/activated/holding/subState/hold/identity/topPanel/action/ActionRow';
import {CooldownStatusPanel} from '../../identity/state/activated/holding/subState/hold/identity/topPanel/cooldown/CooldownStatusPanel';
import {CooldownStatusTag} from '../../identity/state/activated/holding/subState/hold/identity/topPanel/holderStatus/CooldownStatusTag';
import {NotListedTag} from '../../identity/state/activated/holding/subState/hold/identity/topPanel/holderStatus/NotListedTag';
import {Price} from '../../identity/state/activated/holding/subState/hold/identity/topPanel/price/Price';
import {HolderStats} from '../../identity/state/activated/holding/subState/hold/identity/topPanel/stats/HolderStats';

export const IdentityHolderNoListingPanel = () => {
    return (
        <Flex vertical gap={16}>
            <PanelCard>
                <Flex vertical gap={16}>
                    <Flex vertical gap={8}>
                        <Flex justify="space-between">
                            <HoldingPanelHeader />
                            <RefreshHolderButton />
                        </Flex>
                        <Flex gap={8} wrap>
                            <NotListedTag />
                            <CooldownStatusTag />
                        </Flex>
                    </Flex>
                    <HolderStats />
                    <Price />
                    <CooldownStatusPanel />
                    <ActionRow />
                </Flex>
            </PanelCard>
            <ErrorBoundaryComponent childComponentName="AssetPanel">
                <AssetPanel />
            </ErrorBoundaryComponent>
        </Flex>
    );
};
