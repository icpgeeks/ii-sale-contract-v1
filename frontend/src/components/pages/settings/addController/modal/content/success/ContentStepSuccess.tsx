import {Alert, Flex} from 'antd';
import {i18} from 'frontend/src/i18';
import {Footer} from '../../footer/Footer';

export const ContentStepSuccess = () => {
    return (
        <Flex vertical gap={16}>
            <Alert type="success" message={i18.settings.danger.addController.modal.stub.success} />
            <Footer />
        </Flex>
    );
};
