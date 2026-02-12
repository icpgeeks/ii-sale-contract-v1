import {Flex, Typography} from 'antd';
import {AlertActionButton} from 'frontend/src/components/widgets/alert/AlertActionButton';
import {ErrorAlertWithAction} from 'frontend/src/components/widgets/alert/ErrorAlertWithAction';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {useAcceptOfferModalDataContext} from './AcceptOfferModalDataProvider';
import {Footer} from './footer/Footer';
import {Info} from './info/Info';

export const AcceptOfferModal = () => {
    const {actionAvailability, actionErrorPanel, refetchICRCMetadata, refetchICRCMetadataInProgress} = useAcceptOfferModalDataContext();

    const content = useMemo(() => {
        if (actionAvailability.type == 'loading') {
            return <PanelLoadingComponent message={i18.common.loading} />;
        }
        if (actionAvailability.type == 'notAvailable') {
            if (actionAvailability.offerDoesNotExist) {
                /**
                 * emulate "still loading" state when modal is closing
                 */
                return <PanelLoadingComponent message={i18.common.loading} />;
            }
            return (
                <Flex vertical gap={16}>
                    <ErrorAlertWithAction message={i18.common.error.metadataError} action={<AlertActionButton onClick={refetchICRCMetadata} loading={refetchICRCMetadataInProgress} />} />
                    <Footer />
                </Flex>
            );
        }
        return (
            <Flex vertical gap={16}>
                <Info />
                {actionErrorPanel}
                <Footer />
            </Flex>
        );
    }, [actionAvailability, actionErrorPanel, refetchICRCMetadata, refetchICRCMetadataInProgress]);

    return (
        <Flex vertical gap={16}>
            <Typography.Title level={5}>{i18.holder.state.holding.modal.acceptOffer.title}</Typography.Title>
            {content}
        </Flex>
    );
};
