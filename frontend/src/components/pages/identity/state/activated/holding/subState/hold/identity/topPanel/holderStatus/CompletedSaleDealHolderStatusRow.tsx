import {isNullish} from '@dfinity/utils';
import {Flex, Tag} from 'antd';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {TransferredFromContractTag} from './TransferredFromContractTag';

export const CompletedSaleDealHolderStatusRow = () => {
    const {completedSaleDeal, isCompletedSaleDealBuyer} = useIdentityHolderContext();

    if (isNullish(completedSaleDeal)) {
        return null;
    }

    return (
        <Flex gap={8} wrap>
            <SoldPurchasedTag isCompletedSaleDealBuyer={isCompletedSaleDealBuyer} />
            <TransferredFromContractTag />
        </Flex>
    );
};

const SoldPurchasedTag = ({isCompletedSaleDealBuyer}: {isCompletedSaleDealBuyer: boolean}) => {
    if (isCompletedSaleDealBuyer) {
        return <Tag color="green">{i18.holder.state.holding.common.topPanel.saleStatus.purchased}</Tag>;
    }
    return <Tag color="red">{i18.holder.state.holding.common.topPanel.saleStatus.sold}</Tag>;
};
