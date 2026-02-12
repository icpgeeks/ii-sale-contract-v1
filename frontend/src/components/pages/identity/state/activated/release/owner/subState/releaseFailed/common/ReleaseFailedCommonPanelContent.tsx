import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {ReleaseFailedErrorPanel} from '../../../../../common/processingError/backend/releaseError/ReleaseFailedErrorPanel';
import {RestartReleaseIdentityDataProvider, useRestartReleaseIdentityDataContext} from '../../../common/restartReleaseIdentity/RestartReleaseIdentityDataProvider';

export const ReleaseFailedCommonPanelContent = () => {
    return (
        <>
            <ReleaseFailedErrorPanel />
            <RestartReleaseIdentityDataProvider>
                <OkButton />
            </RestartReleaseIdentityDataProvider>
        </>
    );
};

const OkButton = () => {
    const {inlineButtonProps} = useRestartReleaseIdentityDataContext();
    return <PrimaryButton {...inlineButtonProps} />;
};
