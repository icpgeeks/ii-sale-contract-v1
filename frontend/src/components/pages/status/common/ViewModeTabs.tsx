import {Menu, type MenuProps} from 'antd';
import {i18} from 'frontend/src/i18';
import type {MenuInfo} from 'rc-menu/lib/interface';
import {useCallback, useMemo} from 'react';
import {useMatch, useNavigate} from 'react-router-dom';
import {PATH_STATUS, PATH_STATUS_ADVANCED} from '../../skeleton/Router';
import type {ViewMode} from '../StatusEntryPoint';

const items: MenuProps['items'] = [
    {key: 'simple', label: i18.status.tabs.simple},
    {key: 'advanced', label: i18.status.tabs.advanced}
];

export const ViewModeTabs = () => {
    const navigate = useNavigate();
    const matchStatusAdvanced = useMatch(PATH_STATUS_ADVANCED);
    const selectedKeys = useMemo(() => {
        const viewMode: ViewMode = matchStatusAdvanced ? 'advanced' : 'simple';
        return [viewMode];
    }, [matchStatusAdvanced]);

    const handleMenuClick: MenuProps['onClick'] = useCallback(
        (info: MenuInfo) => {
            const viewMode = info.key as ViewMode;
            if (viewMode === 'advanced') {
                navigate(PATH_STATUS_ADVANCED);
            } else {
                navigate(PATH_STATUS);
            }
        },
        [navigate]
    );

    return <Menu items={items} onClick={handleMenuClick} mode="horizontal" selectedKeys={selectedKeys} />;
};
