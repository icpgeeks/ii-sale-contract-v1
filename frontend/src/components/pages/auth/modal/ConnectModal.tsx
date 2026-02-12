import {Flex, Typography} from 'antd';
import {i18} from 'frontend/src/i18';
import {Footer} from './footer/Footer';
import {FAQCheckbox} from './form/FAQCheckbox';
import {RisksCheckbox} from './form/RisksCheckbox';
import {TermsOfUseCheckbox} from './form/TermsOfUseCheckbox';
import {ValidationCheckbox} from './form/ValidationCheckbox';

export const ConnectModal = () => {
    return (
        <Flex vertical gap={16}>
            <Typography.Title level={5}>{i18.auth.connect.confirmationModal.title}</Typography.Title>
            <div>{i18.auth.connect.confirmationModal.description}</div>
            <ValidationCheckbox />
            <FAQCheckbox />
            <TermsOfUseCheckbox />
            <RisksCheckbox />
            <Footer />
        </Flex>
    );
};
