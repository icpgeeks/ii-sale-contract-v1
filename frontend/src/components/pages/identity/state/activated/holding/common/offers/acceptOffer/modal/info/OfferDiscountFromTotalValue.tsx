import {isNullish} from '@dfinity/utils';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {calculatePercentageDifferenceUnsafe} from 'frontend/src/utils/core/number/calculation';
import {useMemo} from 'react';
import {getDiscountFromTotalValue} from '../../../../../subState/hold/identity/topPanel/price/ListedPriceDiscountFromTotalValue';
import {useAcceptOfferModalDataContext} from '../AcceptOfferModalDataProvider';

const precision = 2;
export const OfferDiscountFromTotalValue = () => {
    const {offerAmount} = useAcceptOfferModalDataContext();
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const linkedAssetsTotalValueUlps = linkedAssets.type == 'assets' ? linkedAssets.totalValueUlps : undefined;

    const discount = useMemo(() => {
        if (isNullish(offerAmount) || isNullish(linkedAssetsTotalValueUlps) || linkedAssetsTotalValueUlps == 0n) {
            return undefined;
        }
        return calculatePercentageDifferenceUnsafe(offerAmount, linkedAssetsTotalValueUlps, precision);
    }, [linkedAssetsTotalValueUlps, offerAmount]);

    return getDiscountFromTotalValue(discount);
};
