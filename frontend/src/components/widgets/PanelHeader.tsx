import {isNullish} from '@dfinity/utils';
import {Flex, Typography} from 'antd';
import type {TitleProps} from 'antd/es/typography/Title';
import {mergeClassName} from 'frontend/src/utils/core/dom/domUtils';
import {type ReactNode, useMemo} from 'react';

type Props = {
    title: ReactNode;
    description?: ReactNode;
    danger?: boolean;
    className?: string;
};

const titleLevel: TitleProps['level'] = 4;

export const PanelHeader = (props: Props) => {
    const {title, description, danger, className} = props;

    const classNames = useMemo(() => {
        return mergeClassName(danger ? 'gf-ant-color-error' : undefined, className);
    }, [danger, className]);

    if (isNullish(description)) {
        return (
            <Typography.Title level={titleLevel} className={classNames}>
                {title}
            </Typography.Title>
        );
    } else {
        return (
            <Flex vertical gap={8}>
                <Typography.Title level={titleLevel} className={classNames}>
                    {props.title}
                </Typography.Title>
                {description}
            </Flex>
        );
    }
};
