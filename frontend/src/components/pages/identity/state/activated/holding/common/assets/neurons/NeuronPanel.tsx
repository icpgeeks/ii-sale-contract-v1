import {Flex, Tag} from 'antd';
import {CollapsiblePanel} from 'frontend/src/components/widgets/CollapsiblePanel';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {useUnsellableBadReason} from 'frontend/src/context/identityHolder/useUnsellableBadReason';
import {i18} from 'frontend/src/i18';
import {memo, useMemo} from 'react';
import {NeuronList} from './NeuronList';

export const NeuronPanel = () => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();

    const numberOfNeurons = useMemo(() => (linkedAssets.type == 'assets' ? linkedAssets.numberOfNeurons : 0), [linkedAssets]);

    return (
        <CollapsiblePanel header={<PanelHeader title={<Title numberOfNeurons={numberOfNeurons} />} />} defaultOpened>
            <NeuronList />
        </CollapsiblePanel>
    );
};

const Title = memo((props: {numberOfNeurons: number}) => {
    const unsellableBadReason = useUnsellableBadReason();
    const {numberOfNeurons} = props;

    if (numberOfNeurons == 0 || unsellableBadReason) {
        return i18.holder.state.holding.common.neurons.title;
    }
    return (
        <Flex align="center" gap={16}>
            <span>{i18.holder.state.holding.common.neurons.title}</span>
            <Tag>{numberOfNeurons}</Tag>
        </Flex>
    );
});
