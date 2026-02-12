import {ICPToken} from '@dfinity/utils';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {LargeStatsValueCard} from '../../../../common/LargeStatsValueCard';

export const Price = () => {
    const saleStatus = useIdentityHolderSaleStatus();
    const price = saleStatus.type == 'listed' ? saleStatus.price : undefined;
    return <LargeStatsValueCard title={i18.holder.state.holding.modal.buyNowOrMakeBuyerOffer.price.label} value={formatTokenAmountWithSymbol(price, ICPToken)} />;
};
