import {theme} from 'antd';
import {type CSSProperties, type PropsWithChildren, useMemo} from 'react';

export const InnerCardPanel = (props: PropsWithChildren<{style?: CSSProperties}>) => {
    const {token} = theme.useToken();

    const panelStyle: CSSProperties = useMemo(() => {
        const style: CSSProperties = {
            background: token.colorFillAlter,
            borderRadius: token.borderRadius,
            padding: token.padding
        };
        return {...style, ...props.style};
    }, [props.style, token.borderRadius, token.colorFillAlter, token.padding]);

    return <div style={panelStyle}>{props.children}</div>;
};
