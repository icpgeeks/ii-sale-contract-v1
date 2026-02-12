import {Flex} from 'antd';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {CapturePanelHeader} from '../../../common/CapturePanelHeader';
import {CaptureStepsRow} from '../../../common/CaptureStepsRow';
import {FinalizeCaptureDescription} from '../../../common/finalizeCapture/FinalizeCaptureDescription';
import {FinalizeCaptureSteps} from '../../../common/finalizeCapture/FinalizeCaptureSteps';
import {FinalizeCaptureStepsDataProvider} from '../../../common/finalizeCapture/FinalizeCaptureStepsDataProvider';

export const FinishCapturePanel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <CapturePanelHeader />
                    <CaptureStepsRow />
                </div>
                <FinalizeCaptureDescription />
                <FinalizeCaptureStepsDataProvider>
                    <FinalizeCaptureSteps />
                </FinalizeCaptureStepsDataProvider>
            </Flex>
        </PanelCard>
    );
};
