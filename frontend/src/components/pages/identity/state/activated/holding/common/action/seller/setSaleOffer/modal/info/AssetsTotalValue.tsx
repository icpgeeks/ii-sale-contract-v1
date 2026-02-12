import {ICPToken, isNullish} from '@dfinity/utils';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {LargeStatsValueCard} from '../../../../common/LargeStatsValueCard';

export const AssetsTotalValue = () => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const linkedAssetsTotalValueUlps = linkedAssets.type == 'assets' ? linkedAssets.totalValueUlps : undefined;
    return (
        <LargeStatsValueCard
            title={i18.holder.state.holding.modal.setSaleOffer.totalValue}
            value={formatTokenAmountWithSymbol(linkedAssetsTotalValueUlps, ICPToken)}
            valueAsRegularFont={isNullish(linkedAssetsTotalValueUlps)}
        />
    );
};
