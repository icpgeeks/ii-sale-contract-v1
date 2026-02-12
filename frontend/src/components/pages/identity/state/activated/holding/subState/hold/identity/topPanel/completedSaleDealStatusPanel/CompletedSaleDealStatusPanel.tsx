import {ICPToken, isNullish} from '@dfinity/utils';
import {SuccessAlert} from 'frontend/src/components/widgets/alert/SuccessAlert';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {accountVariantToHex} from 'frontend/src/utils/ic/account';
import {ledgerAccountToAccountVariant} from 'frontend/src/utils/ic/ledgerAccount';
import {useMemo} from 'react';
import type {CompletedSaleDeal} from 'src/declarations/contract/contract.did';

export const CompletedSaleDealStatusPanel = () => {
    const {completedSaleDeal} = useIdentityHolderContextSafe();
    if (isNullish(completedSaleDeal)) {
        return null;
    }
    return <Wrapper completedSaleDeal={completedSaleDeal} />;
};

const Wrapper = ({completedSaleDeal}: {completedSaleDeal: CompletedSaleDeal}) => {
    const {isCompletedSaleDealSeller, isCompletedSaleDealBuyer} = useIdentityHolderContextSafe();

    const sellerTransferAmount = useMemo(() => formatTokenAmountWithSymbol(completedSaleDeal.seller_transfer.value, ICPToken), [completedSaleDeal.seller_transfer]);
    const address = useMemo(() => accountVariantToHex(ledgerAccountToAccountVariant(completedSaleDeal.seller_account)), [completedSaleDeal.seller_account]);

    if (isCompletedSaleDealSeller) {
        return <SellerComponent sellerTransferAmount={sellerTransferAmount} address={address} />;
    } else if (isCompletedSaleDealBuyer) {
        return <BuyerComponent />;
    } else {
        return null;
    }
};

const SellerComponent = ({sellerTransferAmount, address}: {sellerTransferAmount: string; address: string | undefined}) => {
    if (isNullish(address)) {
        return undefined;
    }

    const label = (
        <div>
            <span>{i18.holder.state.holding.common.topPanel.completedSaleDealStatus.seller.part1}</span>
            <span className="gf-noWrap">{sellerTransferAmount}</span>
            <span>{i18.holder.state.holding.common.topPanel.completedSaleDealStatus.seller.part2}</span>
        </div>
    );

    return <SuccessAlert message={label} />;
};

const BuyerComponent = () => {
    const {stateUnion} = useIdentityHolderStateContext();
    const isClosedState = stateUnion?.type == 'Closed';

    const part3 = isClosedState
        ? i18.holder.state.holding.common.topPanel.completedSaleDealStatus.buyer.part2.closed
        : i18.holder.state.holding.common.topPanel.completedSaleDealStatus.buyer.part2.notClosed;

    const label = (
        <div>
            <span>{i18.holder.state.holding.common.topPanel.completedSaleDealStatus.buyer.part1}</span>
            <span>{part3}</span>
        </div>
    );

    return <SuccessAlert message={label} />;
};
