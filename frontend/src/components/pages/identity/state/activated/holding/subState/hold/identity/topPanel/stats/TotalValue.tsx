import {ICPToken, nonNullish} from '@dfinity/utils';
import {AbstractPopover} from 'frontend/src/components/widgets/AbstractPopover';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {useMemo} from 'react';
import {StatsCard} from './StatsCard';

export const TotalValue = () => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const totalValueUlps = linkedAssets.type == 'assets' ? linkedAssets.totalValueUlps : undefined;
    const totalValueUlpsLabel = useMemo(() => formatTokenAmountWithSymbol(totalValueUlps, ICPToken, {maxDecimalPlaces: 2}), [totalValueUlps]);
    const totalValueUlpsLabelFullPrecision = useMemo(() => formatTokenAmountWithSymbol(totalValueUlps, ICPToken), [totalValueUlps]);
    const body = <span>{totalValueUlpsLabel}</span>;
    const popover = nonNullish(totalValueUlps) ? <AbstractPopover content={totalValueUlpsLabelFullPrecision} body={body} trigger={['hover', 'click']} placement="top" mouseEnterDelay={0.5} /> : body;
    return <StatsCard title={i18.holder.state.holding.common.topPanel.stats.totalValue} value={popover} />;
};
