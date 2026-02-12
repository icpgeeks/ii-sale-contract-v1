import {Alert, Flex, Grid} from 'antd';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {PanelHeader} from '../../widgets/PanelHeader';
import {AddControllerBlock} from './addController/AddControllerBlock';
import {CancelSaleIntentionBlock} from './cancelSaleIntention/CancelSaleIntentionBlock';
import {StartReleaseBlock} from './startRelease/StartReleaseBlock';

const {useBreakpoint} = Grid;

export const DangerPanel = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContext();

    if (!isOwnedByCurrentUser) {
        return null;
    }

    return <Alert message={<Content />} type="error" showIcon={false} />;
};

const Content = () => {
    const breakpoint = useBreakpoint();

    return (
        <Flex vertical gap={32} style={{padding: 12}}>
            <PanelHeader danger title={i18.settings.danger.panelTitle} description={<span>{i18.settings.danger.panelSubtitle}</span>} />
            <Flex vertical gap={16}>
                <StartReleaseBlock />
                <Flex gap={16} vertical={breakpoint.xs}>
                    <CancelSaleIntentionBlock />
                    <AddControllerBlock />
                </Flex>
            </Flex>
        </Flex>
    );
};
