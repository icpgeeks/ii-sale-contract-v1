import {InfoCircleOutlined, LoadingOutlined, SettingOutlined} from '@ant-design/icons';
import {Result} from 'antd';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {type ReactNode} from 'react';
import {getRotateAnimationStyleValue} from '../LoadingIconWithProgress';
import {PanelCard} from '../PanelCard';

type IconType = 'loading' | 'settings' | 'info';
type Props = {
    prefix?: ReactNode;
    icon: IconType;
    title?: ReactNode;
    subTitle?: ReactNode;
    extra?: ReactNode;
};

export const AbstractStubPage = (props: Props) => {
    return (
        <PanelCard>
            {props.prefix}
            <AbstractStubContent {...props} />
        </PanelCard>
    );
};

const AbstractStubContent = (props: Props) => {
    return <Result icon={<Icon icon={props.icon} />} title={props.title} subTitle={<div className="gf-tw-balance">{props.subTitle}</div>} extra={props.extra} />;
};

const Icon = (props: Pick<Props, 'icon'>) => {
    switch (props.icon) {
        case 'loading':
            return <LoadingOutlined />;
        case 'settings':
            return <SettingOutlined style={{animation: getRotateAnimationStyleValue(3)}} />;
        case 'info':
            return <InfoCircleOutlined />;
        default: {
            const exhaustiveCheck: never = props.icon;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return null;
        }
    }
};
