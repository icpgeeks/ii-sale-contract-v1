import {Flex, Typography} from 'antd';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {useCancelCaptureIdentityModalDataContext} from './CancelCaptureIdentityModalDataProvider';
import {Footer} from './footer/Footer';

export const CancelCaptureIdentityModal = () => {
    const {actionAvailability, actionErrorPanel} = useCancelCaptureIdentityModalDataContext();

    const content = useMemo(() => {
        if (actionAvailability.type == 'loading') {
            return <PanelLoadingComponent message={i18.common.loading} />;
        }
        return (
            <Flex vertical gap={16}>
                <div>{i18.holder.state.capture.common.modal.restartTransfer.description}</div>
                <WarningAlert message={i18.holder.state.capture.common.modal.restartTransfer.warning} />
                {actionErrorPanel}
                <Footer />
            </Flex>
        );
    }, [actionAvailability, actionErrorPanel]);

    return (
        <Flex vertical gap={16}>
            <Typography.Title level={5}>{i18.holder.state.capture.common.modal.restartTransfer.title}</Typography.Title>
            {content}
        </Flex>
    );
};
