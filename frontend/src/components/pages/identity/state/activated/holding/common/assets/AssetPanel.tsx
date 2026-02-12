import {Flex} from 'antd';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {useMemo} from 'react';
import {AccountPanel} from './accounts/AccountPanel';
import {NeuronPanel} from './neurons/NeuronPanel';

export const AssetPanel = () => {
    const {getStateUnion} = useIdentityHolderStateContext();
    const holdingStateUnion = useMemo(() => getStateUnion('Holding'), [getStateUnion]);

    if (holdingStateUnion?.type == 'FetchAssets') {
        return null;
    }

    return (
        <Flex vertical gap={16}>
            <AccountPanel />
            <NeuronPanel />
        </Flex>
    );
};
