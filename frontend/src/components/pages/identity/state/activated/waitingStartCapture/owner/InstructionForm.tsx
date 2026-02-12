import {Flex} from 'antd';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {useIdentityHolderWaitingStartCaptureDataContext} from './IdentityHolderWaitingStartCaptureDataProvider';
import {PairURLInput} from './PairURLInput';

export const InstructionForm = () => {
    return (
        <div>
            <PairURLInput />
            <Flex vertical gap={16}>
                <ErrorPanel />
                <StartCaptureButton />
            </Flex>
        </div>
    );
};

const StartCaptureButton = () => {
    const {buttonProps} = useIdentityHolderWaitingStartCaptureDataContext();
    return <PrimaryButton {...buttonProps} />;
};

const ErrorPanel = () => {
    const {actionErrorPanel} = useIdentityHolderWaitingStartCaptureDataContext();
    return actionErrorPanel;
};
