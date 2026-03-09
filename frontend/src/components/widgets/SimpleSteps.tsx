import {CheckCircleOutlined} from '@ant-design/icons';
import {Flex, type StepProps} from 'antd';
import {type ReactNode} from 'react';
import {LoadingIconWithProgress} from './LoadingIconWithProgress';

const ICON_SIZE = 14;
const ICON_STROKE_WIDTH = 10;
const STEP_GAP = 20;
const STEP_MARGIN_TOP = 18;
const STEP_LABEL_GAP = 18;
const COLOR_DONE = 'green';
const COLOR_INACTIVE = 'var(--ant-color-text-description)';
const COLOR_BORDER = 'var(--ant-color-border)';

export const SimpleSteps = ({current, items}: {current: number; items: Array<StepProps>}) => (
    <Flex vertical gap={STEP_GAP} style={{marginTop: STEP_MARGIN_TOP}}>
        {items.map((item, idx) => {
            const status: StepProps['status'] = idx < current ? 'finish' : idx === current ? 'process' : 'wait';
            return <StepItem key={idx} label={item.title} status={status} />;
        })}
    </Flex>
);

type StepItemProps = {
    label: ReactNode;
    status: StepProps['status'];
};

const StepItem = ({label, status}: StepItemProps) => {
    const isDone = status === 'finish';
    const isActive = status === 'process';

    return (
        <Flex align="center" gap={STEP_LABEL_GAP} style={{color: isDone || isActive ? undefined : COLOR_INACTIVE}}>
            <StepItemIcon isDone={isDone} isActive={isActive} />
            <span>{label}</span>
        </Flex>
    );
};

const StepItemIcon = ({isDone, isActive}: {isDone: boolean; isActive: boolean}) => {
    if (isDone) {
        return <CheckCircleOutlined style={{fontSize: ICON_SIZE, color: COLOR_DONE}} />;
    }
    if (isActive) {
        return <LoadingIconWithProgress size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />;
    }
    return <span style={{width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE, border: `1px solid ${COLOR_BORDER}`, flexShrink: 0}} />;
};
