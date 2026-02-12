import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {i18} from 'frontend/src/i18';

export const FinalizeCaptureDescription = () => {
    return (
        <>
            <div>{i18.holder.state.common.fetchingAssets.finalizingTransfer.description}</div>
            <WarningAlert message={i18.holder.state.common.fetchingAssets.finalizingTransfer.warning} />
        </>
    );
};
