import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {useMemo} from 'react';
import {ContractActivatedComponent} from './state/activated/ContractActivatedComponent';
import {ContractNotActivatedComponent} from './state/notActivated/ContractNotActivatedComponent';

export const IdentityEntryPoint = () => {
    const {stateUnion} = useIdentityHolderStateContext();
    const isWaitingActivationState = useMemo(() => stateUnion?.type == 'WaitingActivation', [stateUnion?.type]);
    if (isWaitingActivationState) {
        return <ContractNotActivatedComponent />;
    }
    return <ContractActivatedComponent />;
};
