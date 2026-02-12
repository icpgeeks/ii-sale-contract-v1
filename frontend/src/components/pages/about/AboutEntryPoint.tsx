import {Flex} from 'antd';
import {i18} from 'frontend/src/i18';
import {PanelCard} from '../../widgets/PanelCard';
import {PanelHeader} from '../../widgets/PanelHeader';

export const AboutEntryPoint = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <PanelHeader title={i18.about.panelTitle} />
                <div className="gf-preWrap">{i18.about.description}</div>
            </Flex>
        </PanelCard>
    );
};
