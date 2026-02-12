import {isNullish, nonNullish} from '@dfinity/utils';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {useIdentityHolderSaleStatus} from 'frontend/src/context/identityHolder/state/holding/useIdentityHolderSaleStatus';
import {i18} from 'frontend/src/i18';
import {calculatePercentageDifferenceUnsafe} from 'frontend/src/utils/core/number/calculation';
import {formatNumber} from 'frontend/src/utils/core/number/format';
import {isValidPositiveNumber} from 'frontend/src/utils/core/number/transform';
import {useMemo, type ReactNode} from 'react';

const precision = 2;

export const ListedPriceDiscountFromTotalValue = () => {
    const {completedSaleDeal} = useIdentityHolderContext();
    const saleStatus = useIdentityHolderSaleStatus();
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const linkedAssetsTotalValueUlps = linkedAssets.type == 'assets' ? linkedAssets.totalValueUlps : undefined;

    const discount = useMemo(() => {
        if (isNullish(linkedAssetsTotalValueUlps) || linkedAssetsTotalValueUlps == 0n) {
            return undefined;
        }
        const salePrice = saleStatus.type == 'listed' || saleStatus.type == 'sold' ? saleStatus.price : completedSaleDeal?.price;
        if (nonNullish(salePrice)) {
            return calculatePercentageDifferenceUnsafe(salePrice, linkedAssetsTotalValueUlps, precision);
        }
        return undefined;
    }, [linkedAssetsTotalValueUlps, saleStatus, completedSaleDeal]);

    const discountLabel = useMemo(() => {
        return getDiscountFromTotalValue(discount, {noDiscountEmpty: false});
    }, [discount]);

    if (isNullish(discountLabel)) {
        return null;
    }

    return discountLabel;
};

export const getDiscountFromTotalValue = (discount: number | undefined, options?: {precision?: number; prefix?: ReactNode; postfix?: ReactNode; noDiscountEmpty?: boolean}): ReactNode => {
    const {noDiscountEmpty = true, prefix, precision = 2, postfix} = options || {};

    if (isNullish(discount)) {
        return null;
    }
    if (discount == 0) {
        if (noDiscountEmpty) {
            return null;
        }
        return i18.holder.state.holding.common.topPanel.price.noDiscount;
    }
    if (!isValidPositiveNumber(Math.abs(discount))) {
        return null;
    }
    const isNegative = discount < 0;
    const sign = isNegative ? '-' : '+';
    const value = `${sign}${formatNumber(Math.abs(discount), precision)}%`;
    const className = isNegative ? 'gf-ant-color-error' : 'gf-ant-color-success';
    return (
        <div>
            {prefix}
            <span className={className}>{value}</span>
            {` ${i18.holder.state.holding.common.topPanel.price.fromTotalValue}`}
            {postfix}
        </div>
    );
};
