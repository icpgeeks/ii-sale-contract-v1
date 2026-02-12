import {Flex} from 'antd';
import {Navigate, Route} from 'react-router-dom';
import {RootRoutes} from '../../widgets/RootRoutes';
import {PATH_STATUS, PATH_STATUS_ADVANCED} from '../skeleton/Router';
import {ViewModeTabs} from './common/ViewModeTabs';
import {AdvancedStatusPanel} from './status/AdvancedStatusPanel';
import {SimpleStatusPanel} from './status/SimpleStatusPanel';

export type ViewMode = 'simple' | 'advanced';

export const StatusEntryPoint = () => {
    return (
        <Flex vertical gap={16}>
            <ViewModeTabs />
            <RootRoutes>
                <Route path={PATH_STATUS_ADVANCED} element={<AdvancedStatusPanel />} />
                <Route path={PATH_STATUS} element={<SimpleStatusPanel />} />
                <Route path="*" element={<Navigate to={PATH_STATUS} />} />
            </RootRoutes>
        </Flex>
    );
};
