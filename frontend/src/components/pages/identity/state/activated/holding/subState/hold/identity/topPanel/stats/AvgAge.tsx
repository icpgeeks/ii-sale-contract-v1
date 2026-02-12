import {isNullish} from '@dfinity/utils';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {i18} from 'frontend/src/i18';
import {MILLIS_PER_SECOND} from 'frontend/src/utils/core/date/constants';
import {formatDuration} from 'frontend/src/utils/core/date/format';
import {useMemo} from 'react';
import {StatsCard} from './StatsCard';

export const AvgAge = () => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const weightedAverageNeuronAge = linkedAssets.type == 'assets' ? linkedAssets.neurons?.weightedAverageNeuronAge : undefined;
    const value = useMemo(() => {
        if (isNullish(weightedAverageNeuronAge)) {
            return i18.holder.state.holding.common.topPanel.stats.avgAge.noValue;
        }
        const durationMillis = Number(weightedAverageNeuronAge) * MILLIS_PER_SECOND;
        const durationLabel = formatDuration(durationMillis, {shortI18: true});
        return durationLabel ?? i18.holder.state.holding.common.topPanel.stats.avgAge.smallValue;
    }, [weightedAverageNeuronAge]);
    return <StatsCard title={i18.holder.state.holding.common.topPanel.stats.avgAge.title} value={value} />;
};
