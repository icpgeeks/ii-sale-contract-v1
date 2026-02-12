import {Flex} from 'antd';
import {ErrorBoundaryComponent} from 'frontend/src/components/widgets/ErrorBoundaryComponent';
import {AssetPanel} from '../../holding/common/assets/AssetPanel';
import {CompletedSaleDealTopPanel} from '../../holding/subState/hold/identity/topPanel/CompletedSaleDealTopPanel';

export const CompletedSaleDealIdentityPage = () => {
    return (
        <Flex vertical gap={16}>
            <ErrorBoundaryComponent childComponentName="TopPanel">
                <CompletedSaleDealTopPanel />
            </ErrorBoundaryComponent>
            <ErrorBoundaryComponent childComponentName="AssetPanel">
                <AssetPanel />
            </ErrorBoundaryComponent>
        </Flex>
    );
};
