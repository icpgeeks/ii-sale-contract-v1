import {isNullish} from '@dfinity/utils';
import {Col, Flex, Input, Row} from 'antd';
import type {SizeType} from 'antd/es/config-provider/SizeContext';
import type {ReactNode} from 'react';
import {CopyButton} from '../CopyButton';

export const TextAreaReadonlyFormItemRow = (props: {value: string; label?: ReactNode; size?: SizeType; disabled?: boolean; noCopy?: boolean}) => {
    const {value, label, size, disabled, noCopy = false} = props;

    const inputRow = (
        <Row className="gf-width-100" wrap={false}>
            <Col flex="auto">
                <Input.TextArea value={value} readOnly size={size} autoSize disabled={disabled} style={{backgroundColor: 'var(--ant-color-bg-container-disabled)'}} />
            </Col>
            {noCopy ? null : (
                <Col style={{marginLeft: 8}}>
                    <CopyButton text={value} className="gf-height-100" disabled={disabled} />
                </Col>
            )}
        </Row>
    );

    if (isNullish(label)) {
        return inputRow;
    }

    return (
        <Flex vertical gap={2}>
            <div className="gf-textarea-label gf-ant-color-secondary">{label}</div>
            {inputRow}
        </Flex>
    );
};
