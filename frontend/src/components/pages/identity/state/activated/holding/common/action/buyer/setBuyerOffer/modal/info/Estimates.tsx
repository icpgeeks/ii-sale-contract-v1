import {ICPToken} from '@dfinity/utils';
import {Flex} from 'antd';
import {KeyValueHorizontal} from 'frontend/src/components/widgets/KeyValueHorizontal';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {useMemo, type ReactNode} from 'react';
import {useSetBuyerOfferModalDataContext} from '../SetBuyerOfferModalDataProvider';

export const Estimates = () => {
    const {
        requireData: {requireDataAvailability}
    } = useSetBuyerOfferModalDataContext();

    const icrcLedgerFeeUlps = requireDataAvailability.type == 'available' ? requireDataAvailability.icrcLedgerFeeUlps : undefined;
    const transactionFeeUlpsLabel = useMemo<ReactNode>(() => formatTokenAmountWithSymbol(icrcLedgerFeeUlps, ICPToken), [icrcLedgerFeeUlps]);

    return (
        <Flex vertical gap={8}>
            <KeyValueHorizontal label={i18.holder.state.holding.modal.buyNowOrMakeBuyerOffer.estimates.transactionFee} value={transactionFeeUlpsLabel} />
        </Flex>
    );
};
