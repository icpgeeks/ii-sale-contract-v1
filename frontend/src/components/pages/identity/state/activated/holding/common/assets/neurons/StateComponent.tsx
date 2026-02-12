import type {Neuron} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderLinkedAssetsValue';
import {i18} from 'frontend/src/i18';
import {NeuronState} from 'frontend/src/utils/ic/nns/governance.enums';

export const StateComponent = (props: {record: Neuron}) => {
    const {record} = props;
    const value: NeuronState = record.state;
    if (value == NeuronState.Locked) {
        return i18.holder.state.holding.common.neurons.state.locked;
    } else if (value == NeuronState.Dissolving) {
        return i18.holder.state.holding.common.neurons.state.dissolving;
    } else if (value == NeuronState.Spawning) {
        return i18.holder.state.holding.common.neurons.state.spawning;
    } else if (value == NeuronState.Dissolved) {
        return i18.holder.state.holding.common.neurons.state.dissolved;
    }
    return '-';
};
