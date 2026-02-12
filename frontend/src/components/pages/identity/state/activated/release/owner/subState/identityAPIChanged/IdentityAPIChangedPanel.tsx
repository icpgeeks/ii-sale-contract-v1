import {Flex} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {i18} from 'frontend/src/i18';
import {CapturePanelHeader} from '../../../../capture/common/CapturePanelHeader';
import {CaptureStepsRowRaw} from '../../../../capture/common/CaptureStepsRow';
import {useIdentityAPIChangedDataContext} from './IdentityAPIChangedDataProvider';

export const IdentityAPIChangedWarningMessage = () => i18.holder.state.release.identityAPIChanged.description;

export const IdentityAPIChangedPanel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <CapturePanelHeader />
                    <CaptureStepsRowRaw current={3} />
                </div>
                <ErrorAlert message={<IdentityAPIChangedWarningMessage />} />
                <ErrorPanel />
                <TerminateTransferButton />
            </Flex>
        </PanelCard>
    );
};

const ErrorPanel = () => {
    const {actionErrorPanel} = useIdentityAPIChangedDataContext();
    return actionErrorPanel;
};

const TerminateTransferButton = () => {
    const {buttonProps} = useIdentityAPIChangedDataContext();
    const disabled = buttonProps.disabled;
    return (
        <PrimaryButton {...buttonProps} disabled={disabled}>
            {i18.holder.state.release.identityAPIChanged.button}
        </PrimaryButton>
    );
};
