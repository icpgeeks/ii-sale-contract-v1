import {describe, expect, it} from 'vitest';
import {calculatePercentageDifferenceUnsafe, sumOfBigintsIfAllDefined} from './calculation';

describe('calculation utilities', () => {
    describe('sumOfBigintsIfAllDefined', () => {
        it('should return the sum when all values are defined', () => {
            expect(sumOfBigintsIfAllDefined(1n, 2n, 3n)).toBe(6n);
            expect(sumOfBigintsIfAllDefined(0n)).toBe(0n);
            expect(sumOfBigintsIfAllDefined(10n, 20n)).toBe(30n);
            expect(sumOfBigintsIfAllDefined()).toBeUndefined();
        });

        it('should return undefined when any value is undefined', () => {
            expect(sumOfBigintsIfAllDefined(1n, undefined, 3n)).toBeUndefined();
            expect(sumOfBigintsIfAllDefined(undefined)).toBeUndefined();
            expect(sumOfBigintsIfAllDefined(1n, 2n, undefined)).toBeUndefined();
            expect(sumOfBigintsIfAllDefined(undefined, undefined)).toBeUndefined();
        });

        it('should handle negative values', () => {
            expect(sumOfBigintsIfAllDefined(-1n, -2n, -3n)).toBe(-6n);
            expect(sumOfBigintsIfAllDefined(5n, -3n)).toBe(2n);
            expect(sumOfBigintsIfAllDefined(-10n, 10n)).toBe(0n);
        });

        it('should handle large values', () => {
            const large1 = 123456789012345678901234567890n;
            const large2 = 987654321098765432109876543210n;
            expect(sumOfBigintsIfAllDefined(large1, large2)).toBe(large1 + large2);
        });
    });

    describe('calculatePercentageDifferenceUnsafe', () => {
        it('should calculate percentage difference correctly', () => {
            expect(calculatePercentageDifferenceUnsafe(120n, 100n, 2)).toBe(20.0);
            expect(calculatePercentageDifferenceUnsafe(67n, 111n, 2)).toBe(-39.63);
            expect(calculatePercentageDifferenceUnsafe(100n, 100n, 2)).toBe(0.0);
        });

        it('should return undefined for invalid inputs', () => {
            expect(calculatePercentageDifferenceUnsafe(-10n, 100n, 2)).toBeUndefined();
            expect(calculatePercentageDifferenceUnsafe(10n, -100n, 2)).toBeUndefined();
            expect(calculatePercentageDifferenceUnsafe(10n, 0n, 2)).toBeUndefined();
            expect(calculatePercentageDifferenceUnsafe(0n, 0n, 2)).toBeUndefined();
        });
    });
});
