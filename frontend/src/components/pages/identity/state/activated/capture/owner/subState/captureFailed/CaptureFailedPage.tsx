import {Flex} from 'antd';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {CaptureFailedErrorPanel} from '../../../../common/processingError/backend/captureError/CaptureFailedErrorPanel';
import {CapturePanelHeader} from '../../../common/CapturePanelHeader';
import {CancelCaptureIdentityDataProvider, useCancelCaptureIdentityDataContext} from '../../common/cancelCaptureIdentity/CancelCaptureIdentityDataProvider';

export const CaptureFailedPage = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <CapturePanelHeader />
                <CaptureFailedErrorPanel />
                <CancelCaptureIdentityDataProvider>
                    <OkButton />
                </CancelCaptureIdentityDataProvider>
            </Flex>
        </PanelCard>
    );
};

const OkButton = () => {
    const {inlineButtonProps} = useCancelCaptureIdentityDataContext();
    return <PrimaryButton {...inlineButtonProps} />;
};
