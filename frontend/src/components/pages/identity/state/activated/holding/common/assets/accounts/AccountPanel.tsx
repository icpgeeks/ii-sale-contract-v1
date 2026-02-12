import {Flex, Tag} from 'antd';
import {CollapsiblePanel} from 'frontend/src/components/widgets/CollapsiblePanel';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {useUnsellableBadReason} from 'frontend/src/context/identityHolder/useUnsellableBadReason';
import {i18} from 'frontend/src/i18';
import {memo, useMemo} from 'react';
import {AccountList} from './AccountList';

export const AccountPanel = () => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();

    const numberOfAccounts = useMemo(() => (linkedAssets.type == 'assets' ? linkedAssets.numberOfAccounts : 0), [linkedAssets]);

    return (
        <CollapsiblePanel header={<PanelHeader title={<Title numberOfAccounts={numberOfAccounts} />} />} defaultOpened>
            <AccountList />
        </CollapsiblePanel>
    );
};

const Title = memo((props: {numberOfAccounts: number}) => {
    const unsellableBadReason = useUnsellableBadReason();
    const {numberOfAccounts} = props;

    if (numberOfAccounts == 0 || unsellableBadReason) {
        return i18.holder.state.holding.common.accounts.title;
    }
    return (
        <Flex align="center" gap={16}>
            <span>{i18.holder.state.holding.common.accounts.title}</span>
            <Tag>{numberOfAccounts}</Tag>
        </Flex>
    );
});
