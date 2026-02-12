import {Flex, Typography} from 'antd';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {useCancelSaleIntentionModalDataContext} from './CancelSaleIntentionModalDataProvider';
import {Footer} from './footer/Footer';

export const CancelSaleIntentionModal = ({source}: {source: 'manual' | 'transferFromContract'}) => {
    const {actionAvailability, actionErrorPanel} = useCancelSaleIntentionModalDataContext();
    const {identityNumber} = useIdentityHolderContextSafe();

    const content = useMemo(() => {
        if (actionAvailability.type == 'loading') {
            return <PanelLoadingComponent message={i18.common.loading} />;
        }
        return (
            <Flex vertical gap={16}>
                <div>{source == 'manual' ? i18.holder.state.holding.modal.cancelSaleIntention.description : i18.holder.state.holding.modal.cancelSaleIntention.descriptionAsTransferFromContract}</div>
                {source == 'manual' ? <WarningAlert message={i18.holder.state.holding.modal.cancelSaleIntention.warning} /> : null}
                {actionErrorPanel}
                <Footer />
            </Flex>
        );
    }, [actionAvailability.type, actionErrorPanel, source]);

    return (
        <Flex vertical gap={16}>
            <Typography.Title level={5}>{source == 'manual' ? i18.holder.state.holding.modal.cancelSaleIntention.title : i18.holder.state.release.common.panelTitle(identityNumber)}</Typography.Title>
            {content}
        </Flex>
    );
};
