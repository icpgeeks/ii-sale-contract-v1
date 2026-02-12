import {isNullish} from '@dfinity/utils';
import {List} from 'antd';
import type {PaginationConfig} from 'antd/es/pagination';
import {DataEmptyStub} from 'frontend/src/components/widgets/stub/DataEmptyStub';
import {PAGE_SIZE} from 'frontend/src/constants';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import type {Neuron} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderLinkedAssetsValue';
import {useUnsellableBadReason} from 'frontend/src/context/identityHolder/useUnsellableBadReason';
import {useDefaultPaginationConfig} from 'frontend/src/hook/useDefaultPaginationConfig';
import {i18} from 'frontend/src/i18';
import {useCallback, useMemo} from 'react';
import {NeuronListItem} from './NeuronListItem';

export type ItemType = Neuron;

const paginationConfig: PaginationConfig = {
    defaultPageSize: PAGE_SIZE.neurons
};

export const NeuronList = () => {
    const unsellableBadReason = useUnsellableBadReason();

    const linkedAssets = useIdentityHolderLinkedAssetsContext();

    const rowKey = useCallback((record: ItemType) => record.neuronId.toString(), []);

    const dataSource: Array<ItemType> = useMemo(() => {
        const neurons: Array<ItemType> | undefined = linkedAssets.type == 'assets' ? linkedAssets.neurons?.neurons : undefined;
        if (isNullish(neurons) || neurons.length == 0) {
            return [];
        }
        return neurons;
    }, [linkedAssets]);

    const pagination = useDefaultPaginationConfig(paginationConfig);

    if (unsellableBadReason || linkedAssets.type == 'invalidAssets') {
        return <DataEmptyStub description={i18.holder.state.holding.common.topPanel.stats.badValue} />;
    }

    if (dataSource.length == 0) {
        return <DataEmptyStub description={i18.holder.state.holding.common.neurons.stub.empty} />;
    }
    return (
        <List<ItemType>
            rowKey={rowKey}
            dataSource={dataSource}
            pagination={pagination}
            size="small"
            renderItem={(item, _index) => (
                <List.Item>
                    <NeuronListItem record={item} />
                </List.Item>
            )}
            split={true}
        />
    );
};
