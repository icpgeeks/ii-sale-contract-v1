import {Flex} from 'antd';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {i18} from 'frontend/src/i18';

export const IdentityHolderWaitingStartCaptureStatePanelHeader = () => (
    <Flex justify="space-between" align="center">
        <PanelHeader title={i18.holder.state.capture.waitingStartCapture.panelTitle} />
        <ExternalLinkToFAQAsQuestionMark fragment="transfer-to" />
    </Flex>
);
