import {Flex, Tag} from 'antd';
import {DisabledAlert} from 'frontend/src/components/widgets/alert/DisabledAlert';
import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {AssetPanel} from '../../holding/common/assets/AssetPanel';
import {HoldingPanelHeader} from '../../holding/common/HoldingPanelHeader';
import {TransferredFromContractTag} from '../../holding/subState/hold/identity/topPanel/holderStatus/TransferredFromContractTag';
import {HolderStats} from '../../holding/subState/hold/identity/topPanel/stats/HolderStats';

export const IdentityHolderClosedStatePage = () => {
    return (
        <Flex vertical gap={16}>
            <PanelCard>
                <Flex vertical gap={16}>
                    <Flex vertical gap={8}>
                        <HoldingPanelHeader />
                        <Flex gap={8} wrap>
                            <Tag>{i18.holder.state.holding.common.topPanel.saleStatus.notSold}</Tag>
                            <TransferredFromContractTag />
                        </Flex>
                    </Flex>
                    <HolderStats />
                    <AlertPanel />
                </Flex>
            </PanelCard>
            <ErrorBoundaryComponent childComponentName="AssetPanel">
                <AssetPanel />
            </ErrorBoundaryComponent>
        </Flex>
    );
};

const AlertPanel = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContext();
    return <DisabledAlert message={isOwnedByCurrentUser ? i18.holder.state.closed.description.owner : i18.holder.state.closed.description.guest} />;
};
