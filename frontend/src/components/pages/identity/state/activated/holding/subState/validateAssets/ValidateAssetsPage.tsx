import {Flex} from 'antd';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {HoldingPanelHeader} from '../../common/HoldingPanelHeader';
import {FetchValidateAssetsDataProvider} from '../common/refetchValidateAssets/FetchValidateAssetsDataProvider';
import {FetchValidateAssetsSteps} from '../common/refetchValidateAssets/FetchValidateAssetsSteps';
import {Description} from '../fetchAssets/Description';

export const ValidateAssetsPage = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <HoldingPanelHeader />
                <Description />
                <FetchValidateAssetsDataProvider>
                    <FetchValidateAssetsSteps />
                </FetchValidateAssetsDataProvider>
            </Flex>
        </PanelCard>
    );
};
