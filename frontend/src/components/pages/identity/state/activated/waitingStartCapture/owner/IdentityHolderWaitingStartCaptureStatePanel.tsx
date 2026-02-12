import {ExportOutlined} from '@ant-design/icons';
import {Flex} from 'antd';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {ExternalLink} from 'frontend/src/components/widgets/ExternalLink';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {i18} from 'frontend/src/i18';
import {INTERNET_IDENTITY_URL} from 'frontend/src/utils/ic/constants';
import {useState} from 'react';
import {CaptureStepsRow, CaptureStepsRowRaw} from '../../capture/common/CaptureStepsRow';
import {IdentityHolderWaitingStartCaptureStatePanelHeader} from './IdentityHolderWaitingStartCaptureStatePanelHeader';
import {InstructionForm} from './InstructionForm';

export const IdentityHolderWaitingStartCaptureStatePanel = () => {
    const [step, setStep] = useState<1 | 2>(1);

    return step === 1 ? <Step1Panel onClick={() => setStep(2)} /> : <Step2Panel />;
};

const Step1Panel = ({onClick}: {onClick: () => void}) => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <IdentityHolderWaitingStartCaptureStatePanelHeader />
                    <CaptureStepsRowRaw current={0} />
                </div>
                <div>{i18.holder.state.capture.waitingStartCaptureDisclaimer.description}</div>
                <WarningAlert message={i18.holder.state.capture.waitingStartCaptureDisclaimer.warning} />
                <PrimaryButton onClick={onClick}>{i18.holder.state.capture.waitingStartCaptureDisclaimer.button}</PrimaryButton>
            </Flex>
        </PanelCard>
    );
};

const Step2Panel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <IdentityHolderWaitingStartCaptureStatePanelHeader />
                    <CaptureStepsRow />
                </div>
                <Description />
                <InstructionForm />
            </Flex>
        </PanelCard>
    );
};

export const Description = () => {
    return (
        <>
            <div>
                {i18.holder.state.capture.waitingStartCapture.description.part1}
                <ExternalLinkToInternetIdentityWebsite />
                {i18.holder.state.capture.waitingStartCapture.description.part3}
            </div>
            <WarningAlert message={i18.holder.state.capture.waitingStartCapture.warning} />
        </>
    );
};

const ExternalLinkToInternetIdentityWebsite = () => {
    return (
        <span>
            <ExternalLink href={INTERNET_IDENTITY_URL} className="gf-underline gf-underline-hover">
                {i18.holder.state.capture.waitingStartCapture.description.link}
            </ExternalLink>{' '}
            <ExportOutlined className="gf-font-size-smaller" />
        </span>
    );
};
