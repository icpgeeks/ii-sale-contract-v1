import {Flex} from 'antd';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {i18} from 'frontend/src/i18';
import {CapturePanelHeader} from '../../../../common/CapturePanelHeader';
import {CaptureStepsRow} from '../../../../common/CaptureStepsRow';
import {CancelCaptureIdentityButtonContainer} from '../../../common/cancelCaptureIdentity/CancelCaptureIdentityButtonContainer';
import {useNeedConfirmAuthnMethodSessionRegistrationDataContext} from '../NeedConfirmAuthnMethodSessionRegistrationDataProvider';
import {AgreementCheckbox} from './AgreementCheckbox';
import {ConfirmationCode} from './ConfirmationCode';
import {ConfirmHolderAuthnMethodRegistrationButton} from './ConfirmHolderAuthnMethodRegistrationButton';
import {RemainingTime} from './RemainingTime';

export const TimerActiveContent = () => {
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
                    <ConfirmationCode />
                </Flex>
                <AgreementCheckbox />
                <ErrorPanel />
                <ConfirmHolderAuthnMethodRegistrationButton />
                <CancelCaptureIdentityButtonContainerWrapper />
            </Flex>
        </PanelCard>
    );
};

export const Description = () => i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.description;

const CancelCaptureIdentityButtonContainerWrapper = () => {
    const {actionInProgress} = useNeedConfirmAuthnMethodSessionRegistrationDataContext();
    return <CancelCaptureIdentityButtonContainer externalActionInProgress={actionInProgress} />;
};

const RemainingTimeRow = () => {
    const {timerActive} = useNeedConfirmAuthnMethodSessionRegistrationDataContext();
    if (!timerActive) {
        return <div className="gf-ant-color-secondary">{i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.form.verificationCode.expired}</div>;
    }
    return (
        <div className="gf-ant-color-secondary gf-tabular-nums">
            {i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.form.verificationCode.expiresIn}: <RemainingTime />
        </div>
    );
};

const ErrorPanel = () => {
    const {actionErrorPanel} = useNeedConfirmAuthnMethodSessionRegistrationDataContext();
    return actionErrorPanel;
};
