import {InnerCardPanel} from 'frontend/src/components/widgets/InnerCardPanel';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {useUnsellableBadReason} from 'frontend/src/context/identityHolder/useUnsellableBadReason';
import {i18} from 'frontend/src/i18';
import {type ReactNode} from 'react';

export const StatsCard = (props: {title: ReactNode; value: ReactNode}) => {
    const unsellableBadReason = useUnsellableBadReason();
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const value = unsellableBadReason || linkedAssets.type == 'invalidAssets' ? i18.holder.state.holding.common.topPanel.stats.badValue : props.value;
    return (
        <div className="gf-noWrap">
            <InnerCardPanel>
                <div className="gf-all-caps gf-noWrap">{props.title}</div>
                <div className="gf-strong">{value}</div>
            </InnerCardPanel>
        </div>
    );
};
