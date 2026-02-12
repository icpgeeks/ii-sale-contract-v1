import {List} from 'antd';
import type {PaginationConfig} from 'antd/es/pagination';
import {DataEmptyStub} from 'frontend/src/components/widgets/stub/DataEmptyStub';
import {PAGE_SIZE} from 'frontend/src/constants';
import type {BuyerOfferTimestamped} from 'frontend/src/context/identityHolder/identityHolderUtils';
import {useIdentityHolderOffersContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderOffersProvider';
import {useDefaultPaginationConfig} from 'frontend/src/hook/useDefaultPaginationConfig';
import {i18} from 'frontend/src/i18';
import {isEmptyArray} from 'frontend/src/utils/core/array/array';
import {useCallback} from 'react';
import {OfferListItem} from './OfferListItem';

export type ItemType = BuyerOfferTimestamped;

const paginationConfig: PaginationConfig = {
    defaultPageSize: PAGE_SIZE.offers
};

export const OfferList = () => {
    const {offers} = useIdentityHolderOffersContext();
    const rowKey = useCallback((record: ItemType) => record.value.buyer.toText(), []);

    const pagination = useDefaultPaginationConfig(paginationConfig);

    if (isEmptyArray(offers)) {
        return <DataEmptyStub description={i18.holder.state.holding.common.offers.stub.empty} />;
    }

    return (
        <List<ItemType>
            rowKey={rowKey}
            dataSource={offers}
            pagination={pagination}
            size="small"
            renderItem={(item, _index) => (
                <List.Item>
                    <OfferListItem record={item} />
                </List.Item>
            )}
            split={true}
        />
    );
};
