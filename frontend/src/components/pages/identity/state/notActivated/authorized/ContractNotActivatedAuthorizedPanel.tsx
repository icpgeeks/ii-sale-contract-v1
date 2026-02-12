import {Flex} from 'antd';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {i18} from 'frontend/src/i18';
import {InstructionForm} from './InstructionForm';

export const ContractNotActivatedAuthorizedPanel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <PanelHeader title={i18.contract.activation.notActivated.panelTitle} />
                <div>{i18.contract.activation.notActivated.description}</div>
                <WarningAlert message={i18.contract.activation.notActivated.warning} />
                <InstructionForm />
            </Flex>
        </PanelCard>
    );
};
