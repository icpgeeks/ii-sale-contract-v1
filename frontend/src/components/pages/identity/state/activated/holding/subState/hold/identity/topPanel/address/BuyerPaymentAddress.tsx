import {isNullish} from '@dfinity/utils';
import {AccountAddressWithWallerIcon} from 'frontend/src/components/widgets/AccountAddressWithWallerIcon';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderCurrentUserBuyerOffer} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderCurrentUserBuyerOffer';
import {i18} from 'frontend/src/i18';
import {accountVariantToHex} from 'frontend/src/utils/ic/account';
import {ledgerAccountToAccountVariant} from 'frontend/src/utils/ic/ledgerAccount';
import {useMemo} from 'react';

export const BuyerPaymentAddress = () => {
    const {isPotentialLoggedInBuyer} = useIdentityHolderContextSafe();
    const {status: buyerOfferStatus} = useIdentityHolderCurrentUserBuyerOffer();

    const paymentAddress = useMemo(() => {
        if (!isPotentialLoggedInBuyer) {
            return undefined;
        }
        if (buyerOfferStatus.type != 'buyerOffer') {
            return undefined;
        }
        const account = accountVariantToHex(ledgerAccountToAccountVariant(buyerOfferStatus.buyerOffer.value.approved_account));
        return <AccountAddressWithWallerIcon account={account} />;
    }, [isPotentialLoggedInBuyer, buyerOfferStatus]);

    if (isNullish(paymentAddress)) {
        return null;
    }
    return (
        <div>
            <div className="gf-all-caps">{i18.holder.state.holding.common.topPanel.address.paymentLabel}</div>
            <div>{paymentAddress}</div>
        </div>
    );
};
