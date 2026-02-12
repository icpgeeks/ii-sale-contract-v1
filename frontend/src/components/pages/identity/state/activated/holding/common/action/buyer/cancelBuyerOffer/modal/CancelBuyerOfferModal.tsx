import {Flex, Typography} from 'antd';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {useCancelBuyerOfferModalDataContext} from './CancelBuyerOfferModalDataProvider';
import {Footer} from './footer/Footer';

export const CancelBuyerOfferModal = () => {
    const {actionAvailability, actionErrorPanel} = useCancelBuyerOfferModalDataContext();

    const content = useMemo(() => {
        if (actionAvailability.type == 'loading') {
            return <PanelLoadingComponent message={i18.common.loading} />;
        }
        return (
            <Flex vertical gap={16}>
                <div>{i18.holder.state.holding.modal.cancelBuyerOffer.description}</div>
                {actionErrorPanel}
                <Footer />
            </Flex>
        );
    }, [actionAvailability.type, actionErrorPanel]);

    return (
        <Flex vertical gap={16}>
            <Typography.Title level={5}>{i18.holder.state.holding.modal.cancelBuyerOffer.title}</Typography.Title>
            {content}
        </Flex>
    );
};
