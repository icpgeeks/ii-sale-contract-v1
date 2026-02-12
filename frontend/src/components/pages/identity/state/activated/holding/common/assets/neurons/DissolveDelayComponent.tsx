import {isNullish} from '@dfinity/utils';
import type {Neuron} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderLinkedAssetsValue';
import {i18} from 'frontend/src/i18';
import type {NeuronState} from 'frontend/src/utils/ic/nns/governance.enums';
import {useMemo} from 'react';
import {getNeuronDissolveDelayFormatted} from './neuronUtils';

export const DissolveDelayComponent = (props: {record: Neuron}) => {
    const {record} = props;
    const neuronState: NeuronState = record.state;
    const dissolve_delay_seconds = record.dissolveDelaySeconds;

    const label = useMemo(() => {
        const value = getNeuronDissolveDelayFormatted(neuronState, dissolve_delay_seconds);
        if (isNullish(value)) {
            return undefined;
        }
        if (value.type == 'dissolveDelay') {
            return i18.holder.state.holding.common.neurons.dissolveDelay.dissolving(value.value);
        } else if (value.type == 'remaining') {
            return i18.holder.state.holding.common.neurons.dissolveDelay.locked(value.value);
        }
    }, [dissolve_delay_seconds, neuronState]);

    if (isNullish(label)) {
        return null;
    }

    return <div>{label}</div>;
};
