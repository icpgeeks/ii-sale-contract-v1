import {Flex, Typography} from 'antd';
import {AlertActionButton} from 'frontend/src/components/widgets/alert/AlertActionButton';
import {ErrorAlertWithAction} from 'frontend/src/components/widgets/alert/ErrorAlertWithAction';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {Footer} from './footer/Footer';
import {PriceInput} from './form/PriceInput';
import {AssetsTotalValue} from './info/AssetsTotalValue';
import {Estimates} from './info/Estimates';
import {useSetSaleOfferModalDataContext} from './SetSaleOfferModalDataProvider';

export const SetSaleOfferModal = () => {
    const {modalTitle, modalSubTitle, actionAvailability, actionErrorPanel, refetchICRCMetadata, refetchICRCMetadataInProgress} = useSetSaleOfferModalDataContext();

    const content = useMemo(() => {
        if (actionAvailability.type == 'loading') {
            return <PanelLoadingComponent message={i18.common.loading} />;
        } else if (actionAvailability.type == 'dataNotAvailable') {
            return (
                <Flex vertical gap={16}>
                    <ErrorAlertWithAction message={i18.common.error.metadataError} action={<AlertActionButton onClick={refetchICRCMetadata} loading={refetchICRCMetadataInProgress} />} />
                    <Footer />
                </Flex>
            );
        }
        return (
            <Flex vertical gap={16}>
                <div>{modalSubTitle}</div>
                <AssetsTotalValue />
                <Flex vertical gap={8}>
                    <PriceInput />
                    <Estimates />
                </Flex>
                {actionErrorPanel}
                <Footer />
            </Flex>
        );
    }, [actionAvailability.type, actionErrorPanel, modalSubTitle, refetchICRCMetadata, refetchICRCMetadataInProgress]);

    return (
        <Flex vertical gap={16}>
            <Typography.Title level={5}>{modalTitle}</Typography.Title>
            {content}
        </Flex>
    );
};
