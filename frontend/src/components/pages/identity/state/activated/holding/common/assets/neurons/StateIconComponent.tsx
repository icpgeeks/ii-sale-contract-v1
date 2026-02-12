import type {Neuron} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderLinkedAssetsValue';
import IconDissolving from 'frontend/src/media/iconDissolving.svg?react';
import IconHistoryToggleOff from 'frontend/src/media/iconHistoryToggleOff.svg?react';
import IconLockClosed from 'frontend/src/media/iconLockClosed.svg?react';
import IconLockOpen from 'frontend/src/media/iconLockOpen.svg?react';
import {NeuronState} from 'frontend/src/utils/ic/nns/governance.enums';

export const StateIconComponent = (props: {record: Neuron}) => {
    const {record} = props;
    const value: NeuronState = record.state;
    if (value == NeuronState.Locked) {
        return <IconLockClosed style={{marginTop: 1, marginLeft: -2}} />;
    } else if (value == NeuronState.Dissolving) {
        return <IconDissolving style={{marginTop: 1, marginLeft: -1}} />;
    } else if (value == NeuronState.Dissolved) {
        return <IconLockOpen style={{marginTop: 1, marginLeft: -1}} />;
    } else if (value == NeuronState.Spawning) {
        return <IconHistoryToggleOff style={{marginTop: 1, marginLeft: -1}} />;
    }
    return null;
};
