import {Button, type ButtonProps} from 'antd';
import {forwardRef} from 'react';

export const IconOnlyButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'children'>>((props, ref) => {
    return <Button ref={ref} {...props} />;
});

IconOnlyButton.displayName = 'IconOnlyButton';
