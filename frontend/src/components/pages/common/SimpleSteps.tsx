import {i18} from 'frontend/src/i18';

export const SimpleSteps = (props: {current: number; total: number}) => {
    return <div className="gf-ant-color-secondary">{i18.holder.state.common.steps(props.current + 1, props.total)}</div>;
};
