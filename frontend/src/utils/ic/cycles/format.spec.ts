import {describe, expect, it} from 'vitest';
import type {ValueWithUnit} from '../../core/number/types';
import {formatCyclesValueWithUnit, formatCyclesValueWithUnitByStrategy} from './format';

describe('cycles format utils', () => {
    describe('formatCyclesValueWithUnit', () => {
        it.each([
            {label: '1.234... T (12 decimal places)', valueWithUnit: {value: 1.23456789012345, unit: 'T'} as ValueWithUnit, expected: '1.234567890123T'},
            {label: '100 T', valueWithUnit: {value: 100, unit: 'T'} as ValueWithUnit, expected: '100T'},
            {label: '123456.789 T (large)', valueWithUnit: {value: 123456.789, unit: 'T'} as ValueWithUnit, expected: '123 456.789T'},
            {label: '0.000001 T (small)', valueWithUnit: {value: 0.000001, unit: 'T'} as ValueWithUnit, expected: '0.000001T'},
            {label: '1234n T (bigint)', valueWithUnit: {value: 1234n, unit: 'T'} as ValueWithUnit, expected: '1 234T'},
            {label: '1.5 T (trailing zeros trimmed)', valueWithUnit: {value: 1.5, unit: 'T'} as ValueWithUnit, expected: '1.5T'},
            {label: '0 T', valueWithUnit: {value: 0, unit: 'T'} as ValueWithUnit, expected: '0T'},
            {label: '-123.456 T (negative)', valueWithUnit: {value: -123.456, unit: 'T'} as ValueWithUnit, expected: '-123.456T'},
            {label: '100 G', valueWithUnit: {value: 100, unit: 'G'} as ValueWithUnit, expected: '100G'},
            {label: '50 M', valueWithUnit: {value: 50, unit: 'M'} as ValueWithUnit, expected: '50M'},
            {label: '100 (empty unit)', valueWithUnit: {value: 100, unit: ''} as ValueWithUnit, expected: '100'}
        ])('formats $label', ({valueWithUnit, expected}) => {
            expect(formatCyclesValueWithUnit(valueWithUnit)).toBe(expected);
        });

        it('returns default fallback for undefined', () => {
            expect(formatCyclesValueWithUnit(undefined)).toBe('-');
        });

        it('respects custom decimalPlaces option', () => {
            const valueWithUnit: ValueWithUnit = {value: 1.23456789, unit: 'T'};
            expect(formatCyclesValueWithUnit(valueWithUnit, {decimalPlaces: 4})).toBe('1.2346T');
        });

        it('respects custom fallback option', () => {
            expect(formatCyclesValueWithUnit(undefined, {fallback: 'N/A'})).toBe('N/A');
        });
    });

    describe('formatCyclesValueWithUnitByStrategy', () => {
        it.each([
            {label: 'above 0.01T', value: 0.011, expected: '0.01T'},
            {label: 'equal 0.01T', value: 0.01, expected: '0.01T'},
            {label: 'just below 0.01', value: 0.009999, expected: '0.01T'},
            {label: 'near-zero', value: 0.00123456, expected: '0.0012T'},
            {label: 'large value', value: 123.456789, expected: '123.46T'},
            {label: '0.0100001', value: 0.0100001, expected: '0.01T'},
            {label: '0.0099999', value: 0.0099999, expected: '0.01T'}
        ])('short strategy: formats $label', ({value, expected}) => {
            expect(formatCyclesValueWithUnitByStrategy({value, unit: 'T'}, 'short')).toBe(expected);
        });

        it.each([
            {label: 'above 0.01T', value: 0.011, expected: '0.011T'},
            {label: 'equal 0.01T', value: 0.01, expected: '0.01T'},
            {label: 'just below 0.01', value: 0.009999, expected: '0.009999T'},
            {label: 'very small', value: 0.000001234567, expected: '0.000001234567T'},
            {label: 'large value', value: 123.456789, expected: '123.4568T'},
            {label: '0.0100001', value: 0.0100001, expected: '0.01T'},
            {label: '0.0099999', value: 0.0099999, expected: '0.0099999T'}
        ])('long strategy: formats $label', ({value, expected}) => {
            expect(formatCyclesValueWithUnitByStrategy({value, unit: 'T'}, 'long')).toBe(expected);
        });

        it.each([{strategy: 'short' as const}, {strategy: 'long' as const}])('returns fallback for undefined ($strategy strategy)', ({strategy}) => {
            expect(formatCyclesValueWithUnitByStrategy(undefined, strategy)).toBe('-');
        });

        it.each([{strategy: 'short' as const}, {strategy: 'long' as const}])('returns "0T" for zero ($strategy strategy)', ({strategy}) => {
            expect(formatCyclesValueWithUnitByStrategy({value: 0, unit: 'T'}, strategy)).toBe('0T');
        });

        it.each([
            {strategy: 'short' as const, expected: '-1.2346T'},
            {strategy: 'long' as const, expected: '-1.23456T'}
        ])('formats negative value with $strategy strategy', ({strategy, expected}) => {
            expect(formatCyclesValueWithUnitByStrategy({value: -1.23456, unit: 'T'}, strategy)).toBe(expected);
        });

        it.each([{strategy: 'short' as const}, {strategy: 'long' as const}])('formats bigint value with $strategy strategy', ({strategy}) => {
            expect(formatCyclesValueWithUnitByStrategy({value: 100n, unit: 'T'}, strategy)).toBe('100T');
        });

        describe('threshold boundary', () => {
            it.each([
                {value: 0.01000001, expected: '0.01T'},
                {value: 0.00999999, expected: '0.01T'},
                {value: 0.001, expected: '0.001T'},
                {value: 0.0001, expected: '0.0001T'}
            ])('short strategy: $value to "$expected"', ({value, expected}) => {
                expect(formatCyclesValueWithUnitByStrategy({value, unit: 'T'}, 'short')).toBe(expected);
            });

            it.each([
                {value: 0.01000001, expected: '0.01T'},
                {value: 0.00999999, expected: '0.00999999T'},
                {value: 0.001, expected: '0.001T'},
                {value: 0.0001, expected: '0.0001T'},
                {value: 0.000001, expected: '0.000001T'}
            ])('long strategy: $value to "$expected"', ({value, expected}) => {
                expect(formatCyclesValueWithUnitByStrategy({value, unit: 'T'}, 'long')).toBe(expected);
            });
        });
    });
});
