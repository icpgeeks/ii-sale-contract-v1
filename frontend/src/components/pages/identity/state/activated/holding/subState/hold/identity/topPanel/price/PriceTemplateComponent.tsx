import {Flex} from 'antd';
import type {ReactNode} from 'react';
import {ListedPriceDiscountFromTotalValue} from './ListedPriceDiscountFromTotalValue';

export const PriceTemplateComponent = ({label, price}: {label: ReactNode; price: ReactNode}) => (
    <div>
        <div className="gf-all-caps">{label}</div>
        <Flex gap={8} align="end" wrap>
            {price}
            <ListedPriceDiscountFromTotalValue />
        </Flex>
    </div>
);
