import {ICPToken, isNullish} from '@dfinity/utils';
import {Typography} from 'antd';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {useMemo} from 'react';
import {PriceTemplateComponent} from './PriceTemplateComponent';

export const CompletedSaleDealPrice = () => {
    const {completedSaleDeal, isCompletedSaleDealBuyer} = useIdentityHolderContextSafe();
    if (isNullish(completedSaleDeal)) {
        return null;
    }
    return <Inner price={completedSaleDeal.price} isCompletedSaleDealBuyer={isCompletedSaleDealBuyer} />;
};

const Inner = (props: {price: bigint; isCompletedSaleDealBuyer: boolean}) => {
    const price = useMemo(() => {
        return (
            <Typography.Title level={1} style={{lineHeight: 'var(--ant-font-size-heading-1)'}}>
                {formatTokenAmountWithSymbol(props.price, ICPToken)}
            </Typography.Title>
        );
    }, [props.price]);

    const label = useMemo(() => {
        return props.isCompletedSaleDealBuyer ? i18.holder.state.holding.common.topPanel.completedSaleDealPrice.buyer : i18.holder.state.holding.common.topPanel.completedSaleDealPrice.other;
    }, [props.isCompletedSaleDealBuyer]);

    return <PriceTemplateComponent label={label} price={price} />;
};
