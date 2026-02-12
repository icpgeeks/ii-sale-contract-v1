import {ConfigProvider, Typography, type ConfigProviderProps} from 'antd';
import type {ReactNode} from 'react';

const typographyConfig: ConfigProviderProps['typography'] = {style: {lineHeight: 1}};

export const LargeStatsValueCard = (props: {title: ReactNode; value: ReactNode; valueAsRegularFont?: boolean}) => {
    return (
        <div>
            <div className="gf-ant-color-secondary">{props.title}</div>
            <ConfigProvider typography={typographyConfig}>
                {props.valueAsRegularFont ? <Typography.Text>{props.value}</Typography.Text> : <Typography.Title level={1}>{props.value}</Typography.Title>}
            </ConfigProvider>
        </div>
    );
};
