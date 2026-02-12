import {Flex} from 'antd';
import {i18} from 'frontend/src/i18';
import {Footer} from '../../footer/Footer';
import {ManualButton} from './ManualButton';
import {OisyButton} from './OisyButton';

export const ContentStepChoosingAccountSource = () => {
    return (
        <Flex vertical gap={16}>
            <div>{i18.holder.state.holding.modal.setSaleIntention.choosingAccountSource.description}</div>
            <OisyButton />
            <ManualButton />
            <Footer />
        </Flex>
    );
};
