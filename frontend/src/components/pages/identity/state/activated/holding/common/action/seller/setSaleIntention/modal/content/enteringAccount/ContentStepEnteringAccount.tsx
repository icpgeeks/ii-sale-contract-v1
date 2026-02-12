import {Flex} from 'antd';
import {Footer} from '../../footer/Footer';
import {Description} from './Description';
import {ReceiverAccountIdentifierInput} from './ReceiverAccountIdentifierInput';

export const ContentStepEnteringAccount = () => {
    return (
        <Flex vertical gap={8}>
            <Flex vertical gap={16}>
                <Description />
                <ReceiverAccountIdentifierInput />
            </Flex>
            <Footer />
        </Flex>
    );
};
