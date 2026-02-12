import {ICPToken} from '@dfinity/utils';
import {Flex} from 'antd';
import {KeyValueHorizontal} from 'frontend/src/components/widgets/KeyValueHorizontal';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import type {ReactNode} from 'react';
import {useMemo} from 'react';
import {wrapUlpsFormattedValueWithStrong} from '../../../../seller/setSaleOffer/modal/info/Estimates';
import {useBuyNowModalDataContext} from '../BuyNowModalDataProvider';

export const Estimates = () => {
    const {
        requireData: {requireDataAvailability}
    } = useBuyNowModalDataContext();

    const icrcLedgerFeeUlps = requireDataAvailability.type == 'available' ? requireDataAvailability.icrcLedgerFeeUlps : undefined;
    const transactionFeeUlpsLabel = useMemo<ReactNode>(() => formatTokenAmountWithSymbol(icrcLedgerFeeUlps, ICPToken), [icrcLedgerFeeUlps]);

    const totalCostUlps = requireDataAvailability.type == 'available' ? requireDataAvailability.totalCostUlps : undefined;
    const youWillSpendUlpsLabel = useMemo<ReactNode>(() => wrapUlpsFormattedValueWithStrong(totalCostUlps), [totalCostUlps]);

    return (
        <Flex vertical gap={8}>
            <KeyValueHorizontal label={i18.holder.state.holding.modal.buyNowOrMakeBuyerOffer.estimates.transactionFee} value={transactionFeeUlpsLabel} />
            <KeyValueHorizontal label={i18.holder.state.holding.modal.buyNow.estimates.youWillSpend} value={youWillSpendUlpsLabel} />
        </Flex>
    );
};
