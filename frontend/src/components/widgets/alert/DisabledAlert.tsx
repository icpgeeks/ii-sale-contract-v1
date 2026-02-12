import type {ThemeConfig} from 'antd';
import {ConfigProvider} from 'antd';
import type {ComponentProps} from 'react';
import {AbstractAlertWithAction} from './AbstractAlertWithAction';

const orangeWarningTheme: ThemeConfig = {
    token: {
        colorInfoBorder: 'var(--ant-color-border)'
    },
    components: {
        Alert: {
            colorInfoBg: 'var(--ant-color-fill-quaternary)'
        }
    }
};

export const DisabledAlert = (props: Omit<ComponentProps<typeof AbstractAlertWithAction>, 'type' | 'action'>) => {
    return (
        <ConfigProvider theme={orangeWarningTheme}>
            <AbstractAlertWithAction {...props} type="info" />
        </ConfigProvider>
    );
};
