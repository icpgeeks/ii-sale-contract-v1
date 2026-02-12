import {formatValueWithUnit, type Options} from '../../core/number/format';
import type {ValueWithUnit} from '../../core/number/types';

const UNIT_SPACE = '';
const DECIMAL_PLACES = 12;

export const formatCyclesValueWithUnit = (valueWithUnit: ValueWithUnit | undefined, options?: Options): string => {
    const {decimalPlaces = DECIMAL_PLACES, fallback} = options || {};
    return formatValueWithUnit(valueWithUnit, {decimalPlaces, fallback, unitSpace: UNIT_SPACE});
};

type AdaptiveStrategy = 'short' | 'long';

const ADAPTIVE_STRATEGIES = {
    short: {
        above0_01T: 2,
        default: 4
    },
    long: {
        above0_01T: 4,
        default: DECIMAL_PLACES
    }
} as const;

export const formatCyclesValueWithUnitByStrategy = (valueWithUnit: ValueWithUnit | undefined, strategy: AdaptiveStrategy): string => {
    const value = valueWithUnit?.value ?? 0;
    const thresholds = ADAPTIVE_STRATEGIES[strategy];
    const decimalPlaces = value > 0.01 ? thresholds.above0_01T : thresholds.default;
    return formatCyclesValueWithUnit(valueWithUnit, {decimalPlaces});
};
