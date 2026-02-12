import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {useIdentityHolderAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderAssetsProvider';
import {i18} from 'frontend/src/i18';
import {FinalizeCaptureDescription} from '../../../capture/common/finalizeCapture/FinalizeCaptureDescription';

export const Description = () => {
    const {hasAssets} = useIdentityHolderAssetsContext();
    if (hasAssets) {
        return (
            <>
                <div>{i18.holder.state.common.fetchingAssets.refetching.description}</div>
                <WarningAlert message={i18.holder.state.common.fetchingAssets.refetching.warning} />
            </>
        );
    }
    return <FinalizeCaptureDescription />;
};
