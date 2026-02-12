import {ICPToken, nonNullish} from '@dfinity/utils';
import {AbstractPopover} from 'frontend/src/components/widgets/AbstractPopover';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {useMemo} from 'react';
import {StatsCard} from './StatsCard';

export const LockedValue = () => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const neuronsTotalValueUlps = linkedAssets.type == 'assets' ? linkedAssets.neurons?.totalStakeUlps : undefined;
    const neuronsTotalValueUlpsLabel = useMemo(() => formatTokenAmountWithSymbol(neuronsTotalValueUlps, ICPToken, {maxDecimalPlaces: 2}), [neuronsTotalValueUlps]);
    const neuronsTotalValueUlpsLabelFullPrecision = useMemo(() => formatTokenAmountWithSymbol(neuronsTotalValueUlps, ICPToken), [neuronsTotalValueUlps]);
    const body = <span>{neuronsTotalValueUlpsLabel}</span>;
    const popover = nonNullish(neuronsTotalValueUlps) ? (
        <AbstractPopover content={neuronsTotalValueUlpsLabelFullPrecision} body={body} trigger={['hover', 'click']} placement="top" mouseEnterDelay={0.5} />
    ) : (
        body
    );
    return <StatsCard title={i18.holder.state.holding.common.topPanel.stats.lockedValue} value={popover} />;
};
