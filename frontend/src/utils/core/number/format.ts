import {isNullish} from '@dfinity/utils';
import {addThousandSeparator, applyDecimalPrecision, formatDecimalString, roundDecimalString, type FormatOptions} from './decimal/decimal';
import type {ValueWithUnit} from './types';

/**
 * Formats integer and fractional parts into a final string with optional separators and precision.
 */
export const formatNumberParts = (intPart: string, fracPart: string, isNegative: boolean, options?: FormatOptions): string => {
    fracPart = applyDecimalPrecision(fracPart, options);
    if (options?.thousandSeparator) {
        intPart = addThousandSeparator(intPart, options.thousandSeparator);
    }
    const full = fracPart ? `${intPart}.${fracPart}` : intPart;
    return isNegative ? `-${full}` : full;
};

export const formatNumber = (value: number | bigint | undefined | null, decimalPlaces: number = 2): string | undefined => {
    const rawFormatted = formatDecimalString(value);
    const rounded = roundDecimalString(rawFormatted, decimalPlaces);
    return formatDecimalString(rounded, {thousandSeparator: ' '});
};

export type Options = {
    decimalPlaces?: number;
    unitSpace?: string;
    fallback?: string;
};
export const formatValueWithUnit = (valueWithUnit: ValueWithUnit | undefined, options?: Options): string => {
    return formatNumberWithUnit(valueWithUnit?.value, valueWithUnit?.unit, options);
};

export const formatNumberWithUnit = (value: number | bigint | undefined, unit: string = '', options?: Options): string => {
    const {decimalPlaces = 2, fallback = '-', unitSpace = ''} = options || {};
    if (isNullish(value)) {
        return fallback;
    }
    const formatted = formatNumber(value, decimalPlaces);
    if (isNullish(formatted)) {
        return fallback;
    }
    return `${formatted}${unitSpace}${unit}`.trim();
};

export const toNonExponentialString = (value: number | bigint | string | undefined | null): string | undefined => {
    if (value == undefined) {
        return undefined;
    }

    let str: string;

    if (typeof value === 'bigint') {
        return value.toString();
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            return undefined;
        }
        str = value.toString();
    } else if (typeof value === 'string') {
        str = value.trim();
        const num = Number(str);
        if (!Number.isFinite(num)) {
            return undefined;
        }
    } else {
        return undefined;
    }

    /**
     * Convert exponential to decimal using native formatting
     */
    const num = Number(str);
    if (Math.abs(num) < 1.0) {
        const [base, trail] = str.split('e-');
        if (trail) {
            const zeros = '0.' + '0'.repeat(Number(trail) - 1);
            return zeros + base.replace('.', '').replace('-', '');
        }
    } else if (str.includes('e+')) {
        const [base, exp] = str.split('e+');
        const [intPart, fracPart = ''] = base.split('.');
        const zerosToAdd = Number(exp) - fracPart.length;
        return intPart + fracPart + '0'.repeat(Math.max(0, zerosToAdd));
    }

    return num.toString();
};
