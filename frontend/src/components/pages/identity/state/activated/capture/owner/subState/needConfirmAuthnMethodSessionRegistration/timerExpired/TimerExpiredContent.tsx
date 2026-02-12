import {Flex} from 'antd';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {i18} from 'frontend/src/i18';
import {HolderProcessingErrorPanel} from '../../../../../common/processingError/HolderProcessingErrorPanel';
import {CapturePanelHeader} from '../../../../common/CapturePanelHeader';
import {CaptureStepsRow} from '../../../../common/CaptureStepsRow';
import {AgreementCheckbox} from '../timerActive/AgreementCheckbox';
import {ConfirmationCode} from '../timerActive/ConfirmationCode';
import {Description} from '../timerActive/TimerActiveContent';

export const TimerExpiredContent = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <CapturePanelHeader />
                    <CaptureStepsRow />
                </div>
                <Description />
                <Flex vertical gap={8}>
                    <Flex justify="space-between" wrap>
                        <span className="gf-ant-color-secondary">{i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.form.verificationCode.label}</span>
                        <RemainingTimeRow />
                    </Flex>
                    <ConfirmationCode disabled />
                </Flex>
                <AgreementCheckbox disabled />
                <HolderProcessingErrorPanel />
                <WarningAlert message={i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.expiredWarning} />
                <ConfirmHolderAuthnMethodRegistrationButton />
            </Flex>
        </PanelCard>
    );
};

const RemainingTimeRow = () => {
    return <div className="gf-ant-color-secondary">{i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.form.verificationCode.expired}</div>;
};

const ConfirmHolderAuthnMethodRegistrationButton = () => {
    return (
        <DefaultButton disabled loading>
            {i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.button}
        </DefaultButton>
    );
};
