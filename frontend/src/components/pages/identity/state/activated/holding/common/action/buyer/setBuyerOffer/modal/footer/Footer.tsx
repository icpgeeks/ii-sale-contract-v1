import {Flex} from 'antd';
import {CancelButton} from './CancelButton';
import {CancelBuyerOfferButton} from './CancelBuyerOfferButton';
import {OkButton} from './OkButton';

export const Footer = () => {
    return (
        <Flex gap={8} vertical>
            <Flex gap={8} justify="end">
                <CancelButton />
                <OkButton />
            </Flex>
            <CancelBuyerOfferButton />
        </Flex>
    );
};
