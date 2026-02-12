import type {ThemeConfig} from 'antd';
import {ConfigProvider} from 'antd';
import type {ComponentProps} from 'react';
import {AbstractAlertWithAction} from './AbstractAlertWithAction';

const orangeWarningTheme: ThemeConfig = {
    token: {
        colorInfoBorder: 'var(--ant-blue-3)'
    },
    components: {
        Alert: {
            colorInfoBg: 'var(--ant-blue-1)'
        }
    }
};

export const InfoAlert = (props: Omit<ComponentProps<typeof AbstractAlertWithAction>, 'type' | 'action'>) => {
    return (
        <ConfigProvider theme={orangeWarningTheme}>
            <AbstractAlertWithAction {...props} type="info" />
        </ConfigProvider>
    );
};
