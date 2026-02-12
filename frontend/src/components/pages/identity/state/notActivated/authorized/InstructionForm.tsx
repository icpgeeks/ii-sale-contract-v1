import {Flex} from 'antd';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {ActivationCodeInput} from './ActivationCodeInput';
import {useContractNotActivatedAuthorizedDataContext} from './ContractNotActivatedAuthorizedDataProvider';

export const InstructionForm = () => {
    return (
        <div>
            <ActivationCodeInput />
            <Flex vertical gap={16}>
                <ErrorPanel />
                <ActivateContractButton />
            </Flex>
        </div>
    );
};

const ActivateContractButton = () => {
    const {buttonProps} = useContractNotActivatedAuthorizedDataContext();
    return <PrimaryButton {...buttonProps} />;
};

const ErrorPanel = () => {
    const {actionErrorPanel} = useContractNotActivatedAuthorizedDataContext();
    return actionErrorPanel;
};
