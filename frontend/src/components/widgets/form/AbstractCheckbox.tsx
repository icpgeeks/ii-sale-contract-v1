import {Checkbox, Grid} from 'antd';
import {type MouseEvent, type PropsWithChildren, useCallback} from 'react';

const {useBreakpoint} = Grid;

type Props = {
    onClick?: () => void;
    checked: boolean;
    disabled?: boolean;
};
export const AbstractCheckbox = ({onClick, checked, disabled, children}: PropsWithChildren<Props>) => {
    const breakpoint = useBreakpoint();

    const className = breakpoint.xs ? 'gf-checkbox-mobile' : undefined;

    const onClickCheckbox = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            event.stopPropagation();
            event.preventDefault();
            onClick?.();
            return false;
        },
        [onClick]
    );
    return (
        <Checkbox checked={checked} onClick={onClickCheckbox} disabled={disabled} className={className}>
            {children}
        </Checkbox>
    );
};
