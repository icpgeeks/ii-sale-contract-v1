import {Flex} from 'antd';
import {CooldownStatusTag} from './CooldownStatusTag';
import {ListingStatusTag} from './ListingStatusTag';

export const HolderStatusRow = () => {
    return (
        <Flex gap={8} wrap>
            <ListingStatusTag />
            <CooldownStatusTag />
        </Flex>
    );
};
