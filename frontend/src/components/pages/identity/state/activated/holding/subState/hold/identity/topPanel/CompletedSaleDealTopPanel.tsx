import {Flex} from 'antd';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {RefreshHolderButton} from '../../../../../common/RefreshHolderButton';
import {HoldingPanelHeader} from '../../../../common/HoldingPanelHeader';
import {CompletedSaleDealActionRow} from './action/CompletedSaleDealActionRow';
import {CompletedSaleDealBuyerPaymentAddress} from './address/CompletedSaleDealBuyerPaymentAddress';
import {CompletedSaleDealSellerPayoutAddress} from './address/CompletedSaleDealSellerPayoutAddress';
import {CompletedSaleDealStatusPanel} from './completedSaleDealStatusPanel/CompletedSaleDealStatusPanel';
import {CompletedSaleDealHolderStatusRow} from './holderStatus/CompletedSaleDealHolderStatusRow';
import {LastUpdated} from './lastUpdated/LastUpdated';
import {CompletedSaleDealPrice} from './price/CompletedSaleDealPrice';
import {HolderStats} from './stats/HolderStats';

export const CompletedSaleDealTopPanel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <Flex vertical gap={8}>
                    <Flex gap={16} justify="space-between">
                        <Flex gap={8} align="end" wrap>
                            <HoldingPanelHeader />
                            <LastUpdated />
                        </Flex>
                        <RefreshHolderButton />
                    </Flex>
                    <CompletedSaleDealHolderStatusRow />
                </Flex>
                <HolderStats />
                <CompletedSaleDealPrice />
                <CompletedSaleDealSellerPayoutAddress />
                <CompletedSaleDealBuyerPaymentAddress />
                <CompletedSaleDealStatusPanel />
                <CompletedSaleDealActionRow />
            </Flex>
        </PanelCard>
    );
};
