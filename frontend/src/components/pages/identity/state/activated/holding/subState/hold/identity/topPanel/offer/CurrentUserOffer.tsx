import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderCurrentUserBuyerOffer} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderCurrentUserBuyerOffer';
import {i18} from 'frontend/src/i18';
import {BuyerOfferWithDiscountRow} from '../../../../../common/offers/OfferListItem';

export const CurrentUserOffer = () => {
    const {isPotentialLoggedInBuyer} = useIdentityHolderContextSafe();
    const {status: buyerOfferStatus} = useIdentityHolderCurrentUserBuyerOffer();

    if (!isPotentialLoggedInBuyer || buyerOfferStatus.type != 'buyerOffer') {
        return null;
    }

    return (
        <div>
            <div className="gf-all-caps">{i18.holder.state.holding.common.topPanel.offer.title}</div>
            <BuyerOfferWithDiscountRow record={buyerOfferStatus.buyerOffer} />
        </div>
    );
};
