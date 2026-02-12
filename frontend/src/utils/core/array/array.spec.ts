import {describe, expect, it} from 'vitest';
import {arrayToUint8Array, compactArray, isEmptyArray, isNonEmptyArray, sortArrayByComparators, sortArrayByValues} from './array';

describe('array utilities', () => {
    describe('compactArray', () => {
        it('should remove null and undefined values', () => {
            const input = [1, null, 2, undefined, 3, null];
            const result = compactArray(input);
            expect(result).toEqual([1, 2, 3]);
        });

        it('should return empty array when all values are null or undefined', () => {
            const input = [null, undefined, null];
            const result = compactArray(input);
            expect(result).toEqual([]);
        });

        it('should return same array when no null or undefined values', () => {
            const input = [1, 2, 3];
            const result = compactArray(input);
            expect(result).toEqual([1, 2, 3]);
        });
    });

    describe('isEmptyArray', () => {
        it('should return true for null', () => {
            expect(isEmptyArray(null)).toBe(true);
        });

        it('should return true for undefined', () => {
            expect(isEmptyArray(undefined)).toBe(true);
        });

        it('should return true for empty array', () => {
            expect(isEmptyArray([])).toBe(true);
        });

        it('should return false for non-empty array', () => {
            expect(isEmptyArray([1, 2, 3])).toBe(false);
        });

        it('should return false for array with null values', () => {
            expect(isEmptyArray([null, undefined])).toBe(false);
        });
    });

    describe('isNonEmptyArray', () => {
        it('should return false for null', () => {
            expect(isNonEmptyArray(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isNonEmptyArray(undefined)).toBe(false);
        });

        it('should return false for empty array', () => {
            expect(isNonEmptyArray([])).toBe(false);
        });

        it('should return true for non-empty array', () => {
            expect(isNonEmptyArray([1, 2, 3])).toBe(true);
        });
    });

    describe('arrayToUint8Array', () => {
        it('should return same Uint8Array when input is already Uint8Array', () => {
            const input = new Uint8Array([1, 2, 3]);
            const result = arrayToUint8Array(input);
            expect(result).toBe(input);
        });

        it('should convert number array to Uint8Array', () => {
            const input = [1, 2, 3];
            const result = arrayToUint8Array(input);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(Array.from(result)).toEqual([1, 2, 3]);
        });

        it('should handle empty array', () => {
            const input: Array<number> = [];
            const result = arrayToUint8Array(input);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(0);
        });
    });

    describe('sortArrayByComparators', () => {
        it('should sort using single comparator', () => {
            const input = [3, 1, 2];
            const result = sortArrayByComparators(input, (a, b) => a - b);
            expect(result).toEqual([1, 2, 3]);
        });

        it('should sort using multiple comparators', () => {
            const input = [
                {a: 1, b: 2},
                {a: 1, b: 1},
                {a: 2, b: 1}
            ];
            const result = sortArrayByComparators(
                input,
                (x, y) => x.a - y.a,
                (x, y) => x.b - y.b
            );
            expect(result).toEqual([
                {a: 1, b: 1},
                {a: 1, b: 2},
                {a: 2, b: 1}
            ]);
        });

        it('should maintain original order when comparators return 0', () => {
            const input = [1, 2, 3];
            const result = sortArrayByComparators(input, () => 0);
            expect(result).toEqual([1, 2, 3]);
        });
    });

    describe('sortArrayByValues', () => {
        it('should sort by single value extractor', () => {
            const input = [{value: 3}, {value: 1}, {value: 2}];
            const result = sortArrayByValues(input, (item) => item.value);
            expect(result).toEqual([{value: 1}, {value: 2}, {value: 3}]);
        });

        it('should sort by multiple value extractors', () => {
            const input = [
                {name: 'B', age: 20},
                {name: 'A', age: 30},
                {name: 'A', age: 20}
            ];
            const result = sortArrayByValues(
                input,
                (item) => item.name,
                (item) => item.age
            );
            expect(result).toEqual([
                {name: 'A', age: 20},
                {name: 'A', age: 30},
                {name: 'B', age: 20}
            ]);
        });

        it('should handle string values', () => {
            const input = ['banana', 'apple', 'cherry'];
            const result = sortArrayByValues(input, (item) => item);
            expect(result).toEqual(['apple', 'banana', 'cherry']);
        });
    });
});
