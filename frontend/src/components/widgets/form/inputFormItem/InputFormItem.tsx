import type {FormItemProps, InputProps} from 'antd';
import {Form, Input} from 'antd';
import {useCallback, type ChangeEvent, type ReactNode} from 'react';

export type InputFormItemState = Pick<InputProps, 'status'> & {
    error?: ReactNode;
};

type Props = InputFormItemState &
    Pick<InputProps, 'placeholder' | 'disabled' | 'readOnly' | 'inputMode' | 'style' | 'suffix'> &
    Pick<FormItemProps, 'noStyle'> & {
        value: string | undefined;
        setValue?: (value: string | undefined) => void;
        label?: ReactNode;
        onBlur?: () => void;
    };
export const InputFormItem = ({value, setValue, label, onBlur, error, status, placeholder, disabled, readOnly, inputMode, style, noStyle, suffix}: Props) => {
    const onChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const raw = event.target.value;
            setValue?.(raw);
        },
        [setValue]
    );

    return (
        <Form.Item label={label} validateStatus={status} help={error} layout="vertical" noStyle={noStyle}>
            <Input
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly}
                inputMode={inputMode}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-1p-ignore
                suffix={suffix}
                styles={{input: style}}
            />
        </Form.Item>
    );
};
