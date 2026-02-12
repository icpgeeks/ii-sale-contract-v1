import {Button, type ButtonProps} from 'antd';

export const LinkButton = (props: Omit<ButtonProps, 'type'>) => {
    return <Button {...props} type="link" />;
};
