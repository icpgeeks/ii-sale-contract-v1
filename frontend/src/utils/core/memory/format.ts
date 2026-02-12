import {formatValueWithUnit, type Options} from '../number/format';
import type {ValueWithUnit} from '../number/types';

const UNIT_SPACE = ' ';
const DECIMAL_PLACES = 2;

export const formatMemoryBytesValueWithUnit = (valueWithUnit: ValueWithUnit | undefined, options?: Options): string => {
    const {decimalPlaces = DECIMAL_PLACES, fallback} = options || {};
    return formatValueWithUnit(valueWithUnit, {decimalPlaces, fallback, unitSpace: UNIT_SPACE});
};
