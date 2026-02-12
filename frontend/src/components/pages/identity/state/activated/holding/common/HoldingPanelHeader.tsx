import {isEmptyString} from '@dfinity/utils';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';

export const HoldingPanelHeader = () => {
    const {identityNumber, identityName} = useIdentityHolderContextSafe();
    const message = useMemo(() => i18.holder.state.holding.common.panelTitle(identityNumber), [identityNumber]);
    const name = useMemo(() => {
        if (isEmptyString(identityName)) {
            return null;
        }
        const value = i18.holder.state.holding.common.panelSubtitle(identityName);
        return <span className="gf-ant-color-secondary gf-font-size-small">{value}</span>;
    }, [identityName]);
    return <PanelHeader title={message} description={name} className="strict-line-height" />;
};
