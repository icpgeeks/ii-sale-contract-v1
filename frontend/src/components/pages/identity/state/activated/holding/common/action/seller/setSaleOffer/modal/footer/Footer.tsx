import {Flex} from 'antd';
import {CancelButton} from './CancelButton';
import {CancelSaleOfferButton} from './CancelSaleOfferButton';
import {OkButton} from './OkButton';

export const Footer = () => {
    return (
        <Flex gap={8} vertical>
            <Flex gap={8}>
                <CancelButton />
                <OkButton />
            </Flex>
            <CancelSaleOfferButton />
        </Flex>
    );
};
