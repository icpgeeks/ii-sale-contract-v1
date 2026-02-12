import {Flex} from 'antd';
import {ConnectButton} from 'frontend/src/components/pages/auth/ConnectButton';
import {ToolbarMenu} from './menu/ToolbarMenu';

export const ToolbarRight = () => {
    return (
        <Flex align="center" gap={16}>
            <ConnectButton />
            <ToolbarMenu />
        </Flex>
    );
};
