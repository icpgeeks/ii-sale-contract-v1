import {Col, Row} from 'antd';
import {AvgAge} from './AvgAge';
import {AvgDissolveDelay} from './AvgDissolveDelay';
import {LockedValue} from './LockedValue';
import {TotalValue} from './TotalValue';

export const HolderStats = () => {
    return (
        <Row gutter={[8, 8]} wrap>
            <Col flex="auto">
                <TotalValue />
            </Col>
            <Col flex="auto">
                <LockedValue />
            </Col>
            <Col flex="auto">
                <AvgAge />
            </Col>
            <Col flex="auto">
                <AvgDissolveDelay />
            </Col>
        </Row>
    );
};
