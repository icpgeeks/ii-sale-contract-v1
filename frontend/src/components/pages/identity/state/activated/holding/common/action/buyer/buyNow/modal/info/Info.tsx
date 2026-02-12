import {Flex} from 'antd';
import {ListedPriceDiscountFromTotalValue} from '../../../../../../subState/hold/identity/topPanel/price/ListedPriceDiscountFromTotalValue';
import {Estimates} from './Estimates';
import {Price} from './Price';

export const Info = () => {
    return (
        <Flex vertical gap={16}>
            <Flex gap={8} align="end">
                <Price />
                <ListedPriceDiscountFromTotalValue />
            </Flex>
            <Estimates />
        </Flex>
    );
};
