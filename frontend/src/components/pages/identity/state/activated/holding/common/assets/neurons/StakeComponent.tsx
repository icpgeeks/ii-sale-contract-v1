import {ICPToken, isNullish} from '@dfinity/utils';
import {Typography} from 'antd';
import type {Neuron} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderLinkedAssetsValue';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {useMemo} from 'react';

export const StakeComponent = (props: {record: Neuron}) => {
    const {
        record: {totalStakeUlps}
    } = props;

    const label = useMemo(() => {
        const amount = formatTokenAmountWithSymbol(totalStakeUlps, ICPToken);
        if (isNullish(amount)) {
            return null;
        }
        return amount;
    }, [totalStakeUlps]);

    if (isNullish(label)) {
        return '-';
    }

    return <Typography.Title level={4}>{label}</Typography.Title>;
};
