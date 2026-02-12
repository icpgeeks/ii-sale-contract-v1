import {isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {getStoredCaptureRegistrationId} from 'frontend/src/components/pages/common/TemporaryUIData';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {InputFormItem} from 'frontend/src/components/widgets/form/inputFormItem/InputFormItem';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {HolderProcessingErrorPanel} from '../../../../common/processingError/HolderProcessingErrorPanel';
import {Description} from '../../../../waitingStartCapture/owner/IdentityHolderWaitingStartCaptureStatePanel';
import {IdentityHolderWaitingStartCaptureStatePanelHeader} from '../../../../waitingStartCapture/owner/IdentityHolderWaitingStartCaptureStatePanelHeader';
import {buildPairURL} from '../../../../waitingStartCapture/owner/registrationIdUtils';
import {CaptureStepsRow} from '../../../common/CaptureStepsRow';
import {CancelCaptureIdentityButtonContainer} from '../../common/cancelCaptureIdentity/CancelCaptureIdentityButtonContainer';

export const StartCapturePanel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <IdentityHolderWaitingStartCaptureStatePanelHeader />
                    <CaptureStepsRow />
                </div>
                <Description />
                <InstructionForm />
                <CancelCaptureIdentityButtonContainer />
            </Flex>
        </PanelCard>
    );
};

const InstructionForm = () => {
    const registrationId = getStoredCaptureRegistrationId();

    const url = useMemo<string | undefined>(() => {
        if (isNullish(registrationId)) {
            return undefined;
        }
        return buildPairURL(registrationId);
    }, [registrationId]);

    return (
        <div>
            <InputFormItem
                value={url}
                disabled={true}
                placeholder={i18.holder.state.capture.waitingStartCapture.form.pairUrl.placeholder}
                label={i18.holder.state.capture.waitingStartCapture.form.pairUrl.label}
            />
            <Flex vertical gap={16}>
                <HolderProcessingErrorPanel />
                <StartCaptureButton />
            </Flex>
        </div>
    );
};

const StartCaptureButton = () => {
    return (
        <DefaultButton disabled loading={true}>
            {i18.holder.state.capture.waitingStartCapture.button}
        </DefaultButton>
    );
};
