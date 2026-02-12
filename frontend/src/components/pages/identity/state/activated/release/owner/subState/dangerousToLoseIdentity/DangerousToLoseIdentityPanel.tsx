import {Flex} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {i18} from 'frontend/src/i18';
import {CapturePanelHeader} from '../../../../capture/common/CapturePanelHeader';
import {CaptureStepsRowRaw} from '../../../../capture/common/CaptureStepsRow';
import {DeleteHolderAuthnMethodModalRenderer, sendOpenDeleteHolderAuthnMethodModalNotification} from '../../common/deleteHolderAuthnMethod/modal/DeleteHolderAuthnMethodModalRenderer';

export const DangerousToLoseIdentityWarningMessage = () => i18.holder.state.release.dangerousToLoseIdentity.description;

export const DangerousToLoseIdentityPanel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <CapturePanelHeader />
                    <CaptureStepsRowRaw current={3} />
                </div>
                <ErrorAlert message={<DangerousToLoseIdentityWarningMessage />} />
                <RestartTransferButton />
            </Flex>
        </PanelCard>
    );
};

const RestartTransferButton = () => {
    return (
        <>
            <PrimaryButton onClick={sendOpenDeleteHolderAuthnMethodModalNotification}>{i18.holder.state.release.dangerousToLoseIdentity.button}</PrimaryButton>
            <DeleteHolderAuthnMethodModalRenderer />
        </>
    );
};
