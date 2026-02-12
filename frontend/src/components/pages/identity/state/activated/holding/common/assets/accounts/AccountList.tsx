import {isNullish} from '@dfinity/utils';
import {List} from 'antd';
import type {PaginationConfig} from 'antd/es/pagination';
import {DataEmptyStub} from 'frontend/src/components/widgets/stub/DataEmptyStub';
import {PAGE_SIZE} from 'frontend/src/constants';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import type {MainAccount, SubAccount} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderLinkedAssetsValue';
import {useUnsellableBadReason} from 'frontend/src/context/identityHolder/useUnsellableBadReason';
import {useDefaultPaginationConfig} from 'frontend/src/hook/useDefaultPaginationConfig';
import {i18} from 'frontend/src/i18';
import {useCallback, useMemo} from 'react';
import {AccountListItem} from './AccountListItem';

export type ItemType = MainAccount | SubAccount;

const paginationConfig: PaginationConfig = {
    defaultPageSize: PAGE_SIZE.accounts
};

export const AccountList = () => {
    const unsellableBadReason = useUnsellableBadReason();
    const linkedAssets = useIdentityHolderLinkedAssetsContext();

    const rowKey = useCallback((record: ItemType) => record.accountIdentifierHex, []);

    const dataSource: Array<ItemType> = useMemo(() => {
        if (linkedAssets.type != 'assets' || isNullish(linkedAssets.accounts)) {
            return [];
        }

        const result: Array<ItemType> = [linkedAssets.accounts.mainAccount, ...linkedAssets.accounts.subAccounts];

        return result;
    }, [linkedAssets]);

    const pagination = useDefaultPaginationConfig(paginationConfig);

    if (unsellableBadReason || linkedAssets.type == 'invalidAssets') {
        return <DataEmptyStub description={i18.holder.state.holding.common.topPanel.stats.badValue} />;
    }

    if (dataSource.length == 0) {
        return <DataEmptyStub description={i18.holder.state.holding.common.accounts.stub.empty} />;
    }

    return (
        <List<ItemType>
            rowKey={rowKey}
            dataSource={dataSource}
            pagination={pagination}
            size="small"
            renderItem={(item, _index) => (
                <List.Item>
                    <AccountListItem item={item} />
                </List.Item>
            )}
            split={true}
        />
    );
};
