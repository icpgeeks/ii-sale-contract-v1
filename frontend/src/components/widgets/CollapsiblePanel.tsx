import {Card, Collapse} from 'antd';
import {useMemo, type PropsWithChildren, type ReactNode} from 'react';

type Props = {
    header: ReactNode;
    defaultOpened?: boolean;
};

export const CollapsiblePanel = ({header, defaultOpened, children}: PropsWithChildren<Props>) => {
    const items = useMemo(() => {
        return [
            {
                key: 'panel',
                label: header,
                children: children
            }
        ];
    }, [children, header]);
    return (
        <Card>
            <Collapse items={items} ghost defaultActiveKey={defaultOpened ? 'panel' : undefined} expandIconPosition="end" className="gf-collapsible-panel" />
        </Card>
    );
};
