import {ICPToken} from '@dfinity/utils';
import {Flex} from 'antd';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {LargeStatsValueCard} from '../../../../action/common/LargeStatsValueCard';
import {useAcceptOfferModalDataContext} from '../AcceptOfferModalDataProvider';
import {Estimates} from './Estimates';
import {OfferDiscountFromTotalValue} from './OfferDiscountFromTotalValue';

export const Info = () => {
    return (
        <Flex vertical gap={16}>
            <div>{i18.holder.state.holding.modal.acceptOffer.description}</div>
            <Flex gap={8} align="end" wrap>
                <OfferAmount />
                <OfferDiscountFromTotalValue />
            </Flex>
            <Estimates />
        </Flex>
    );
};

const OfferAmount = () => {
    const {offerAmount} = useAcceptOfferModalDataContext();
    return <LargeStatsValueCard title={i18.holder.state.holding.modal.acceptOffer.offer} value={formatTokenAmountWithSymbol(offerAmount, ICPToken)} />;
};
