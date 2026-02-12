import {Flex, Typography} from 'antd';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {Footer} from './footer/Footer';
import {useStartReleaseModalDataContext} from './StartReleaseModalDataProvider';

export const StartReleaseModal = () => {
    const {actionAvailability, actionErrorPanel} = useStartReleaseModalDataContext();
    const {identityNumber} = useIdentityHolderContextSafe();

    const title = useMemo(() => i18.holder.state.release.common.panelTitle(identityNumber), [identityNumber]);

    const content = useMemo(() => {
        if (actionAvailability.type == 'loading') {
            return <PanelLoadingComponent message={i18.common.loading} />;
        }
        return (
            <>
                <div>{i18.holder.state.holding.startRelease.description}</div>
                <WarningAlert message={i18.holder.state.holding.startRelease.warning} />
                {actionErrorPanel}
                <Footer />
            </>
        );
    }, [actionAvailability.type, actionErrorPanel]);

    return (
        <Flex vertical gap={16}>
            <Typography.Title level={5}>{title}</Typography.Title>
            {content}
        </Flex>
    );
};
