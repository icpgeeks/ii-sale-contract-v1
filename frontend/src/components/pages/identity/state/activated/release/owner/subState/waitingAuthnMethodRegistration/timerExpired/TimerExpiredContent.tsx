import {Flex, Input} from 'antd';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {i18} from 'frontend/src/i18';
import {HolderProcessingErrorPanel} from '../../../../../common/processingError/HolderProcessingErrorPanel';
import {ReleasePanelHeader} from '../../../../common/ReleasePanelHeader';
import {ReleaseStepsRow} from '../../../../common/ReleaseStepsRow';
import {RestartReleaseIdentityButtonContainer} from '../../../common/restartReleaseIdentity/RestartReleaseIdentityButtonContainer';
import {StepsComponent} from '../timerActive/StepsComponent';
import {Description, PairLink} from '../timerActive/TimerActiveContent';

export const TimerExpiredContent = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <ReleasePanelHeader />
                    <ReleaseStepsRow />
                </div>
                <Description />
                <StepsComponent link={<PairLink />} input={<VerificationCodeInput />} />
                <HolderProcessingErrorPanel />
                <ConfirmOwnerAuthnMethodRegistrationButton />
                <RestartReleaseIdentityButtonContainer externalActionInProgress={true} />
            </Flex>
        </PanelCard>
    );
};

const VerificationCodeInput = () => {
    return <Input placeholder={i18.holder.state.release.waitingAuthnMethodRegistration.form.verificationCode.placeholder} disabled={true} />;
};

const ConfirmOwnerAuthnMethodRegistrationButton = () => {
    return <DefaultButton disabled>{i18.holder.state.release.waitingAuthnMethodRegistration.button}</DefaultButton>;
};
