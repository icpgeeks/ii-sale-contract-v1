import {ICPToken} from '@dfinity/utils';
import {Flex, Typography} from 'antd';
import {AccountAddressWithWallerIcon} from 'frontend/src/components/widgets/AccountAddressWithWallerIcon';
import type {SubAccount} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderLinkedAssetsValue';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';

export const SubAccountListItem = ({item}: {item: SubAccount}) => {
    const info = (
        <Flex vertical gap={4}>
            <Typography.Title level={4}>{formatTokenAmountWithSymbol(item.balanceUlps, ICPToken)}</Typography.Title>
            <div>
                <div className="gf-ant-color-secondary gf-font-size-smaller">{item.name}</div>
                <AccountAddressWithWallerIcon account={item.accountIdentifierHex} className="gf-ant-color-secondary gf-font-size-smaller" />
            </div>
        </Flex>
    );

    return info;
};
