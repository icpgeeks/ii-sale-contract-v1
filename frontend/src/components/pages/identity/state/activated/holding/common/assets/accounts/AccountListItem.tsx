import type {ItemType} from './AccountList';
import {MainAccountListItem} from './MainAccountListItem';
import {SubAccountListItem} from './SubAccountListItem';

type Props = {
    item: ItemType;
};

export const AccountListItem = (props: Props) => {
    const {item} = props;

    if (item.type == 'main') {
        return <MainAccountListItem item={item} />;
    }
    return <SubAccountListItem item={item} />;
};
