import {Flex} from 'antd';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {i18} from 'frontend/src/i18';
import {HolderProcessingErrorPanel} from '../../../../common/processingError/HolderProcessingErrorPanel';
import {ReleasePanelHeader} from '../../../common/ReleasePanelHeader';
import {ReleaseStepsRow} from '../../../common/ReleaseStepsRow';

export const StartReleasePanel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <ReleasePanelHeader />
                    <ReleaseStepsRow />
                </div>
                <PanelLoadingComponent message={i18.holder.state.release.startRelease.stub.loading} />
                <HolderProcessingErrorPanel />
            </Flex>
        </PanelCard>
    );
};
