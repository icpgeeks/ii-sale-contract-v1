import {isEmptyString, isNullish} from '@dfinity/utils';
import {i18} from 'frontend/src/i18';
import {trimIfDefined} from 'frontend/src/utils/core/string/string';
import {type AccountVariant, decodeAccountVariantSafe} from 'frontend/src/utils/ic/account';
import type {InputFormItemState} from './InputFormItem';
import type {ValidationStatus} from './inputFormItemUtils';

export type AccountVariantValidationStatus = ValidationStatus<{accountVariant: AccountVariant}, InputFormItemState & {validatedInputValue: string | undefined}>;

export const validateAccountVariant = (raw: string | undefined): AccountVariantValidationStatus => {
    const input = trimIfDefined(raw);
    if (isEmptyString(input)) {
        return {type: 'invalid', validatedInputValue: undefined};
    }
    const value = decodeAccountVariantSafe(input);
    if (isNullish(value)) {
        return {
            type: 'invalid',
            status: 'error',
            error: i18.common.error.inputInvalidAccount,
            validatedInputValue: input
        };
    }
    return {type: 'valid', accountVariant: value};
};
