import {Flex} from 'antd';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {i18} from 'frontend/src/i18';

export const ContentStepLoadingInitialData = () => {
    return (
        <Flex vertical gap={16}>
            <PanelLoadingComponent message={i18.common.loading} />
        </Flex>
    );
};
