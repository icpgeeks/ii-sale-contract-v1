import {Flex, Typography} from 'antd';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {useBuyNowModalDataContext} from './BuyNowModalDataProvider';
import {Footer} from './footer/Footer';
import {BuyNowNotAvailableErrorPanel} from './info/BuyNowNotAvailableErrorPanel';
import {Info} from './info/Info';

export const BuyNowModal = () => {
    const {
        requireData: {requireDataAvailability},
        actionErrorPanel
    } = useBuyNowModalDataContext();

    const content = useMemo(() => {
        if (requireDataAvailability.type == 'loading') {
            return <PanelLoadingComponent message={i18.common.loading} />;
        }
        if (requireDataAvailability.type == 'notAvailable') {
            return (
                <Flex vertical gap={16}>
                    <BuyNowNotAvailableErrorPanel />
                    <Footer />
                </Flex>
            );
        }
        return (
            <Flex vertical gap={16}>
                <div>{i18.holder.state.holding.modal.buyNow.description}</div>
                <Info />
                {actionErrorPanel}
                <Footer />
            </Flex>
        );
    }, [requireDataAvailability.type, actionErrorPanel]);

    return (
        <Flex vertical gap={16}>
            <Typography.Title level={5}>{i18.holder.state.holding.modal.buyNow.title}</Typography.Title>
            {content}
        </Flex>
    );
};
