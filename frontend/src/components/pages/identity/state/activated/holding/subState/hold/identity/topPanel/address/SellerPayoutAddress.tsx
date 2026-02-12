import {isNullish} from '@dfinity/utils';
import {AccountAddressWithWallerIcon} from 'frontend/src/components/widgets/AccountAddressWithWallerIcon';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {i18} from 'frontend/src/i18';
import {encodeAccountVariantSafe} from 'frontend/src/utils/ic/account';
import {useMemo} from 'react';

export const SellerPayoutAddress = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const saleStatus = useIdentityHolderSaleStatus();
    const payoutAddress = useMemo(() => {
        if (!isOwnedByCurrentUser) {
            return undefined;
        }
        if (saleStatus.type == 'noData' || saleStatus.type == 'saleIntentionNotSet') {
            return i18.holder.state.holding.common.topPanel.address.sellerNotSet;
        }
        const account = encodeAccountVariantSafe(saleStatus.receiverAccountVariant);
        return <AccountAddressWithWallerIcon account={account} />;
    }, [isOwnedByCurrentUser, saleStatus]);

    if (isNullish(payoutAddress)) {
        return null;
    }

    return (
        <div>
            <div className="gf-all-caps">{i18.holder.state.holding.common.topPanel.address.sellerLabel}</div>
            <div>{payoutAddress}</div>
        </div>
    );
};
