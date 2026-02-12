import {Flex, Input} from 'antd';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {HolderProcessingErrorPanel} from '../../../../common/processingError/HolderProcessingErrorPanel';
import {ReleasePanelHeader} from '../../../common/ReleasePanelHeader';
import {ReleaseStepsRow} from '../../../common/ReleaseStepsRow';
import {RestartReleaseIdentityButtonContainer} from '../../common/restartReleaseIdentity/RestartReleaseIdentityButtonContainer';
import {StepsComponent} from '../waitingAuthnMethodRegistration/timerActive/StepsComponent';
import {Description, PairLink} from '../waitingAuthnMethodRegistration/timerActive/TimerActiveContent';

export const ConfirmAuthnMethodRegistrationPanel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <ReleasePanelHeader />
                    <ReleaseStepsRow />
                </div>
                <Description />
                <div>
                    <StepsComponent link={<PairLink />} input={<VerificationCodeInput />} />
                    <HolderProcessingErrorPanel />
                </div>
                <ConfirmOwnerAuthnMethodRegistrationButton />
                <RestartReleaseIdentityButtonContainer />
            </Flex>
        </PanelCard>
    );
};

const VerificationCodeInput = () => {
    const {getSubStateValue} = useIdentityHolderStateContext();
    const releaseSubState = useMemo(() => getSubStateValue('Release', 'ConfirmAuthnMethodRegistration'), [getSubStateValue]);

    const verificationCode = releaseSubState?.verification_code;
    return <Input value={verificationCode} disabled={true} />;
};

const ConfirmOwnerAuthnMethodRegistrationButton = () => {
    return (
        <DefaultButton disabled loading>
            {i18.holder.state.release.waitingAuthnMethodRegistration.button}
        </DefaultButton>
    );
};
