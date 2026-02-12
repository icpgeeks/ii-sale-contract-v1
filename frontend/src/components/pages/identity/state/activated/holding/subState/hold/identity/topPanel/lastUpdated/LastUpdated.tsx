import {isNullish} from '@dfinity/utils';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {i18} from 'frontend/src/i18';
import {formatDateAgo} from 'frontend/src/utils/core/date/format';

export const LastUpdated = () => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const earliestTimestampMillis = linkedAssets.type == 'assets' ? linkedAssets.earliestTimestampMillis : undefined;
    if (isNullish(earliestTimestampMillis)) {
        return null;
    }
    return <div className="gf-font-size-small gf-ant-color-secondary">{i18.holder.state.holding.common.topPanel.lastUpdated(formatDateAgo(Number(earliestTimestampMillis)))}</div>;
};
