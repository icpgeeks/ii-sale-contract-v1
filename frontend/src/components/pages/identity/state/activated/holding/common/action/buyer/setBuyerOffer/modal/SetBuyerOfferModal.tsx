import {Flex, Typography} from 'antd';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {ListedPriceDiscountFromTotalValue} from '../../../../../subState/hold/identity/topPanel/price/ListedPriceDiscountFromTotalValue';
import {Footer} from './footer/Footer';
import {OfferAmountInput} from './form/OfferAmountInput';
import {Estimates} from './info/Estimates';
import {Price} from './info/Price';
import {SetBuyerOfferNotAvailableErrorPanel} from './info/SetBuyerOfferNotAvailableErrorPanel';
import {useSetBuyerOfferModalDataContext} from './SetBuyerOfferModalDataProvider';

export const SetBuyerOfferModal = () => {
    const {
        modalTitle,
        modalSubTitle,
        requireData: {requireDataAvailability},
        actionErrorPanel
    } = useSetBuyerOfferModalDataContext();

    const content = useMemo(() => {
        if (requireDataAvailability.type == 'loading') {
            return <PanelLoadingComponent message={i18.common.loading} />;
        }
        if (requireDataAvailability.type == 'notAvailable') {
            return (
                <Flex vertical gap={16}>
                    <SetBuyerOfferNotAvailableErrorPanel />
                    <Footer />
                </Flex>
            );
        }
        return (
            <Flex vertical gap={16}>
                <Flex vertical gap={16}>
                    {modalSubTitle}
                    <WarningAlert message={i18.holder.state.holding.modal.makeOffer.nonBindingOfferWarning} />
                    <Flex gap={8} align="end">
                        <Price />
                        <ListedPriceDiscountFromTotalValue />
                    </Flex>
                    <OfferAmountInput />
                    <Estimates />
                </Flex>
                <Flex vertical gap={16}>
                    {actionErrorPanel}
                    <Footer />
                </Flex>
            </Flex>
        );
    }, [actionErrorPanel, modalSubTitle, requireDataAvailability.type]);

    return (
        <Flex vertical gap={16}>
            <Typography.Title level={5}>{modalTitle}</Typography.Title>
            {content}
        </Flex>
    );
};
