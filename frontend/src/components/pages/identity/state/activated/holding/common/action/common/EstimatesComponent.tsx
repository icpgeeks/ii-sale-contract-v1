import {ICPToken, isEmptyString} from '@dfinity/utils';
import {Flex} from 'antd';
import {KeyValueHorizontal} from 'frontend/src/components/widgets/KeyValueHorizontal';
import {QuestionPopover} from 'frontend/src/components/widgets/QuestionPopover';
import {DEVELOPER_REWARD_PERMYRIAD, HUB_REWARD_PERMYRIAD, REFERRAL_REWARD_PERMYRIAD} from 'frontend/src/constants';
import {i18} from 'frontend/src/i18';
import {formatNumberWithUnit} from 'frontend/src/utils/core/number/format';
import {calculatePermyriadAsPercentage} from 'frontend/src/utils/core/number/permyriad';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {useMemo} from 'react';
import type {Estimates} from '../seller/setSaleOffer/modal/estimatesCalculator';
import {wrapUlpsFormattedValueWithStrong} from '../seller/setSaleOffer/modal/info/Estimates';

export const EstimatesComponent = ({estimates}: {estimates: Estimates | undefined}) => {
    const referralRewardUlpsLabel = useMemo(() => {
        const value = formatNumberWithUnit(calculatePermyriadAsPercentage(REFERRAL_REWARD_PERMYRIAD), '%', {decimalPlaces: 2, unitSpace: ''});
        return i18.holder.state.holding.modal.setSaleOffer.referralReward(value);
    }, []);
    const referralRewardUlpsFormattedValue = useMemo(() => getFeeFormattedValue(estimates?.referralRewardUlps), [estimates?.referralRewardUlps]);

    const developerRewardUlpsLabel = useMemo(() => {
        const value = formatNumberWithUnit(calculatePermyriadAsPercentage(DEVELOPER_REWARD_PERMYRIAD), '%', {decimalPlaces: 2, unitSpace: ''});
        return i18.holder.state.holding.modal.setSaleOffer.developerReward(value);
    }, []);
    const developerRewardUlpsFormattedValue = useMemo(() => getFeeFormattedValue(estimates?.developerRewardUlps), [estimates?.developerRewardUlps]);

    const hubRewardUlpsLabel = useMemo(() => {
        const value = formatNumberWithUnit(calculatePermyriadAsPercentage(HUB_REWARD_PERMYRIAD), '%', {decimalPlaces: 2, unitSpace: ''});
        return i18.holder.state.holding.modal.setSaleOffer.hubReward(value);
    }, []);
    const hubRewardUlpsFormattedValue = useMemo(() => getFeeFormattedValue(estimates?.hubRewardIncludingTransactionFeesUlps), [estimates?.hubRewardIncludingTransactionFeesUlps]);

    const totalRewardUlpsLabel = useMemo(() => {
        const value = formatNumberWithUnit(calculatePermyriadAsPercentage(REFERRAL_REWARD_PERMYRIAD + DEVELOPER_REWARD_PERMYRIAD + HUB_REWARD_PERMYRIAD), '%', {decimalPlaces: 2, unitSpace: ''});
        return i18.holder.state.holding.modal.setSaleOffer.totalReward(value);
    }, []);

    const totalRewardUlpsFormattedValue = useMemo(() => getFeeFormattedValue(estimates?.totalRewardIncludingTransactionFeesUlps), [estimates?.totalRewardIncludingTransactionFeesUlps]);

    const sellerAmountUlps = estimates?.sellerAmountUlps;
    const sellerAmountUlpsLabel = useMemo(() => wrapUlpsFormattedValueWithStrong(sellerAmountUlps), [sellerAmountUlps]);

    const popoverContent = (
        <Flex vertical gap={8} style={{minWidth: 300}}>
            <KeyValueHorizontal gap={8} label={developerRewardUlpsLabel} value={developerRewardUlpsFormattedValue} />
            <KeyValueHorizontal gap={8} label={referralRewardUlpsLabel} value={referralRewardUlpsFormattedValue} />
            <KeyValueHorizontal gap={8} label={hubRewardUlpsLabel} value={hubRewardUlpsFormattedValue} />
        </Flex>
    );

    return (
        <Flex vertical gap={8}>
            <KeyValueHorizontal
                label={
                    <Flex gap={8}>
                        <span>{totalRewardUlpsLabel}</span>
                        <QuestionPopover content={popoverContent} />
                    </Flex>
                }
                value={totalRewardUlpsFormattedValue}
            />
            <KeyValueHorizontal label={i18.holder.state.holding.modal.setSaleOffer.youWillReceive} value={sellerAmountUlpsLabel} />
        </Flex>
    );
};

const getFeeFormattedValue = (ulps: bigint | undefined) => {
    const value = formatTokenAmountWithSymbol(ulps, ICPToken, {fallback: ''});
    if (isEmptyString(value)) {
        return '-';
    }
    return `-${value}`;
};
