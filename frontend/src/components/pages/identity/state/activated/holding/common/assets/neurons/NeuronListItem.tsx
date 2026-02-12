import {isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {DissolveDelayComponent} from './DissolveDelayComponent';
import type {ItemType} from './NeuronList';
import {StakeComponent} from './StakeComponent';
import {StateComponent} from './StateComponent';
import {StateIconComponent} from './StateIconComponent';
import {NeuronInfoModalRenderer} from './modal/NeuronInfoModalRenderer';

type Props = {
    record: ItemType | undefined;
};

export const NeuronListItem = (props: Props) => {
    const {record} = props;
    if (isNullish(record)) {
        return <NeuronInfoFallback />;
    }
    const info = (
        <Flex vertical gap={4}>
            <div>
                <StakeComponent record={record} />
            </div>
            <Flex vertical className="gf-ant-color-secondary gf-font-size-smaller">
                <div className="gf-ant-color-secondary">{record.neuronId.toString()}</div>
                <Flex gap={4} align="center" wrap>
                    <StateIconComponent record={record} />
                    <StateComponent record={record} />
                    <DissolveDelayComponent record={record} />
                </Flex>
                <NeuronInfoModalRenderer record={record} />
            </Flex>
        </Flex>
    );

    return info;
};

const NeuronInfoFallback = () => <div className="gf-ant-color-secondary gf-font-size-smaller">-</div>;
