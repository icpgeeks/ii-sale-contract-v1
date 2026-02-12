import {isNullish} from '@dfinity/utils';
import {AccountAddressWithWallerIcon} from 'frontend/src/components/widgets/AccountAddressWithWallerIcon';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {accountVariantToHex} from 'frontend/src/utils/ic/account';
import {ledgerAccountToAccountVariant} from 'frontend/src/utils/ic/ledgerAccount';
import {useMemo} from 'react';
import type {CompletedSaleDeal} from 'src/declarations/contract/contract.did';

export const CompletedSaleDealBuyerPaymentAddress = () => {
    const {completedSaleDeal} = useIdentityHolderContextSafe();
    if (isNullish(completedSaleDeal)) {
        return null;
    }
    return <Wrapper completedSaleDeal={completedSaleDeal} />;
};

const Wrapper = ({completedSaleDeal}: {completedSaleDeal: CompletedSaleDeal}) => {
    const {isCompletedSaleDealBuyer} = useIdentityHolderContextSafe();

    const address = useMemo(() => accountVariantToHex(ledgerAccountToAccountVariant(completedSaleDeal.buyer_account)), [completedSaleDeal.buyer_account]);

    if (isCompletedSaleDealBuyer) {
        return (
            <div>
                <div className="gf-all-caps">{i18.holder.state.holding.common.topPanel.address.paymentLabel}</div>
                <AccountAddressWithWallerIcon account={address} />
            </div>
        );
    } else {
        return null;
    }
};
