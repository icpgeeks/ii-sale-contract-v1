import {Flex} from 'antd';
import {BackButton} from './BackButton';
import {NextButton} from './NextButton';

export const Footer = () => {
    return (
        <Flex gap={8}>
            <BackButton />
            <NextButton />
        </Flex>
    );
};
