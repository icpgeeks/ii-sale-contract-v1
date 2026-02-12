import {ICPToken, isEmptyString, isNullish} from '@dfinity/utils';
import {parseAtomicAmount} from 'frontend/src/utils/core/number/atomic/atomic';
import {isValidPositiveNumber, parseStringToNumber} from 'frontend/src/utils/core/number/transform';
import {trimIfDefined} from 'frontend/src/utils/core/string/string';

export type ValidationStatus<Valid extends Record<string, any> | never = never, Invalid extends Record<string, any> | never = never> =
    | ([Valid] extends [never] ? {type: 'valid'} : {type: 'valid'} & Valid)
    | ([Invalid] extends [never] ? {type: 'invalid'} : {type: 'invalid'} & Invalid);

export type ExtractValidStatus<T> = T extends {type: 'valid'} & infer V ? V : never;

export const validateRequiredString = (raw: string | undefined): ValidationStatus<{value: string}> => {
    const input = trimIfDefined(raw);
    if (isEmptyString(input)) {
        return {type: 'invalid'};
    }
    return {type: 'valid', value: input};
};

export const validatePositiveAmountUlps = (raw: string | undefined | null, atomicPlaces: number = ICPToken.decimals): ValidationStatus<{ulps: bigint}, {cause?: 'empty' | 'zero'}> => {
    const input = trimIfDefined(raw);
    if (isEmptyString(input)) {
        return {type: 'invalid', cause: 'empty'};
    }
    const parsedNumber = parseStringToNumber(input);
    if (isNullish(parsedNumber)) {
        return {type: 'invalid'};
    }
    const isParsedNumberValid = isValidPositiveNumber(parsedNumber);
    if (!isParsedNumberValid) {
        return {type: 'invalid'};
    }
    const ulps = parseAtomicAmount(input, atomicPlaces);
    if (isNullish(ulps)) {
        return {type: 'invalid'};
    }
    if (ulps > 0n) {
        return {type: 'valid', ulps};
    }
    return {type: 'invalid', cause: 'zero'};
};
