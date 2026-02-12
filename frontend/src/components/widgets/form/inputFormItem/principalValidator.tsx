import {type Principal} from '@dfinity/principal';
import {isEmptyString, isNullish} from '@dfinity/utils';
import {i18} from 'frontend/src/i18';
import {trimIfDefined} from 'frontend/src/utils/core/string/string';
import {getPrincipalIfValid} from 'frontend/src/utils/ic/principal';
import type {InputFormItemState} from './InputFormItem';
import type {ValidationStatus} from './inputFormItemUtils';

export type PrincipalValidationStatus = ValidationStatus<{principal: Principal}, InputFormItemState>;

export const validatePrincipal = (raw: string | undefined): PrincipalValidationStatus => {
    const input = trimIfDefined(raw);
    if (isEmptyString(input)) {
        return {type: 'invalid'};
    }
    const principal = getPrincipalIfValid(input);
    if (isNullish(principal)) {
        return {
            type: 'invalid',
            status: 'error',
            error: i18.common.error.inputInvalidPrincipal
        };
    }
    return {type: 'valid', principal};
};
