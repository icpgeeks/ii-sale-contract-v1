import {Flex} from 'antd';
import {getStoredCaptureActivationCode} from 'frontend/src/components/pages/common/TemporaryUIData';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {AbstractCheckbox} from 'frontend/src/components/widgets/form/AbstractCheckbox';
import {TextAreaReadonlyFormItemRow} from 'frontend/src/components/widgets/form/textareaFormItem/TextAreaReadonlyFormItemRow';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {i18} from 'frontend/src/i18';
import {HolderProcessingErrorPanel} from '../../../../common/processingError/HolderProcessingErrorPanel';
import {INTERNET_IDENTITY_PAIR_REGISTRATION_ID_LENGTH} from '../../../../waitingStartCapture/owner/registrationIdUtils';
import {CapturePanelHeader} from '../../../common/CapturePanelHeader';
import {CaptureStepsRow} from '../../../common/CaptureStepsRow';
import {CancelCaptureIdentityButtonContainer} from '../../common/cancelCaptureIdentity/CancelCaptureIdentityButtonContainer';
import {Description} from '../needConfirmAuthnMethodSessionRegistration/timerActive/TimerActiveContent';

export const ExitAndRegisterHolderAuthnMethodPage = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <CapturePanelHeader />
                    <CaptureStepsRow />
                </div>
                <Description />
                <Flex vertical gap={8}>
                    <span className="gf-ant-color-secondary">{i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.form.verificationCode.label}</span>
                    <ConfirmationCode />
                </Flex>
                <AgreementCheckbox />
                <HolderProcessingErrorPanel />
                <PrimaryButton disabled loading>
                    {i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.button}
                </PrimaryButton>
                <CancelCaptureIdentityButtonContainer externalActionInProgress={true} />
            </Flex>
        </PanelCard>
    );
};

const ConfirmationCode = () => {
    const activationCode = getStoredCaptureActivationCode() ?? '*'.repeat(INTERNET_IDENTITY_PAIR_REGISTRATION_ID_LENGTH);
    return <TextAreaReadonlyFormItemRow value={activationCode} size="large" disabled={true} />;
};

const AgreementCheckbox = () => {
    return (
        <AbstractCheckbox checked disabled>
            {i18.holder.state.capture.NeedConfirmAuthnMethodSessionRegistration.form.agreementCheckbox}
        </AbstractCheckbox>
    );
};
