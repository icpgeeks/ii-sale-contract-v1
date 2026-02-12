import {Flex} from 'antd';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {i18} from 'frontend/src/i18';
import {Footer} from '../../footer/Footer';

export const ContentStepLoadingAccountTransactions = () => {
    return (
        <Flex vertical gap={16}>
            <PanelLoadingComponent message={i18.holder.state.holding.modal.setSaleIntention.loadingTransactions.stub} />
            <Footer />
        </Flex>
    );
};
