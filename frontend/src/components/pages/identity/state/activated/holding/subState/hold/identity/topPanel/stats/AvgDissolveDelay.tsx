import {isNullish} from '@dfinity/utils';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {i18} from 'frontend/src/i18';
import {MILLIS_PER_SECOND} from 'frontend/src/utils/core/date/constants';
import {formatDuration} from 'frontend/src/utils/core/date/format';
import {useMemo} from 'react';
import {StatsCard} from './StatsCard';

export const AvgDissolveDelay = () => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const weightedAverageDissolveDelay = linkedAssets.type == 'assets' ? linkedAssets.neurons?.weightedAverageDissolveDelay : undefined;
    const value = useMemo(() => {
        if (isNullish(weightedAverageDissolveDelay)) {
            return i18.holder.state.holding.common.topPanel.stats.avgDelay.noValue;
        }
        const durationMillis = Number(weightedAverageDissolveDelay) * MILLIS_PER_SECOND;
        const durationLabel = formatDuration(durationMillis, {shortI18: true});
        return durationLabel ?? i18.holder.state.holding.common.topPanel.stats.avgDelay.smallValue;
    }, [weightedAverageDissolveDelay]);
    return <StatsCard title={i18.holder.state.holding.common.topPanel.stats.avgDelay.title} value={value} />;
};
