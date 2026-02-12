import {Tag} from 'antd';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {i18} from 'frontend/src/i18';

export const TransferredFromContractTag = () => {
    const {stateUnion} = useIdentityHolderStateContext();
    const isClosedState = stateUnion?.type == 'Closed';
    if (!isClosedState) {
        return null;
    }
    return <Tag>{i18.holder.state.holding.common.topPanel.saleStatus.transferredToDevice}</Tag>;
};
