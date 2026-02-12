import {Flex} from 'antd';
import {ToolbarLeft} from './left/ToolbarLeft';
import {ToolbarRight} from './right/ToolbarRight';

export const ToolbarBody = () => {
    return (
        <Flex wrap={false} gap={16} justify="space-between" align="center" className="gf-toolbarCardBody">
            <ToolbarLeft />
            <ToolbarRight />
        </Flex>
    );
};
