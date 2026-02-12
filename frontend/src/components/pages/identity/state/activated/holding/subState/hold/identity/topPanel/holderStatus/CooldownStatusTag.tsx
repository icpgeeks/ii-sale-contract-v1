import {isNullish} from '@dfinity/utils';
import Tag from 'antd/es/tag';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {i18} from 'frontend/src/i18';

export const CooldownStatusTag = () => {
    const saleStatus = useIdentityHolderSaleStatus();
    if (saleStatus.type == 'noData' || isNullish(saleStatus.quarantineEndTimeMillis)) {
        return <Tag color="green">{i18.holder.state.holding.common.topPanel.cooldownStatus.ended}</Tag>;
    }
    return <Tag color="orange">{i18.holder.state.holding.common.topPanel.cooldownStatus.active}</Tag>;
};
