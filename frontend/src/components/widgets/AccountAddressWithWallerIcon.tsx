import {WalletOutlined} from '@ant-design/icons';
import {mergeClassName} from 'frontend/src/utils/core/dom/domUtils';
import {useMemo} from 'react';

export const AccountAddressWithWallerIcon = ({className, account}: {className?: string; account: string | undefined}) => {
    const classNames = useMemo<string>(() => {
        return mergeClassName('gf-noWrap', className);
    }, [className]);
    return (
        <div className={classNames}>
            <WalletOutlined /> <span className="gf-whiteSpaceNormal">{account}</span>
        </div>
    );
};
