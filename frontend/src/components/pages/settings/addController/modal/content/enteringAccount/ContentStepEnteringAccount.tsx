import {Flex} from 'antd';
import {useAddControllerModalDataContext} from '../../AddControllerModalDataProvider';
import {Footer} from '../../footer/Footer';
import {ControllerInput} from './ControllerInput';
import {Description} from './Description';

export const ContentStepEnteringAccount = () => {
    return (
        <div>
            <Flex vertical gap={16}>
                <Description />
                <ControllerInput />
            </Flex>
            <Flex vertical gap={16}>
                <ErrorPanel />
                <Footer />
            </Flex>
        </div>
    );
};

const ErrorPanel = () => {
    const {actionErrorPanel} = useAddControllerModalDataContext();
    return actionErrorPanel;
};
