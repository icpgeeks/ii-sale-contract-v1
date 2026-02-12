import {Flex} from 'antd';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {useIdentityHolderAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderAssetsProvider';
import {CapturePanelHeader} from '../../../capture/common/CapturePanelHeader';
import {CaptureStepsRowRaw} from '../../../capture/common/CaptureStepsRow';
import {HoldingPanelHeader} from '../../common/HoldingPanelHeader';
import {FetchValidateAssetsDataProvider} from '../common/refetchValidateAssets/FetchValidateAssetsDataProvider';
import {FetchValidateAssetsSteps} from '../common/refetchValidateAssets/FetchValidateAssetsSteps';
import {Description} from './Description';

export const FetchAssetsPage = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <HeaderPanel />
                <Description />
                <FetchValidateAssetsDataProvider>
                    <FetchValidateAssetsSteps />
                </FetchValidateAssetsDataProvider>
            </Flex>
        </PanelCard>
    );
};

const HeaderPanel = () => {
    const {hasAssets} = useIdentityHolderAssetsContext();
    if (hasAssets) {
        return <HoldingPanelHeader />;
    }
    return (
        <div>
            <CapturePanelHeader />
            <CaptureStepsRowRaw current={3} />
        </div>
    );
};
