import {describe, expect, it} from 'vitest';
import {arrayToUint8Array, compactArray, isEmptyArray, isNonEmptyArray, sortArrayByComparators, sortArrayByValues} from './array';

describe('array utilities', () => {
    describe('compactArray', () => {
        it('returns [] when input is empty', () => {
            expect(compactArray([])).toEqual([]);
        });

        it('filters out null and undefined values', () => {
            expect(compactArray([1, null, 2, undefined, 3, null])).toEqual([1, 2, 3]);
        });

        it('returns [] when all values are null or undefined', () => {
            expect(compactArray([null, undefined, null])).toEqual([]);
        });

        it('returns all values when none are nullish', () => {
            expect(compactArray([1, 2, 3])).toEqual([1, 2, 3]);
        });

        it('keeps falsy-but-not-nullish values: 0, false, empty string', () => {
            expect(compactArray([0, null, false, undefined, ''])).toEqual([0, false, '']);
        });

        it('works with string values', () => {
            expect(compactArray(['a', null, 'b', undefined])).toEqual(['a', 'b']);
        });

        it('works with object values', () => {
            const obj = {id: 1};
            expect(compactArray([obj, null, undefined])).toEqual([obj]);
        });
    });

    describe('isEmptyArray', () => {
        it.each<[string, null | undefined | Array<unknown>]>([
            ['null', null],
            ['undefined', undefined],
            ['empty array', []]
        ])('returns true for %s', (_, input) => {
            expect(isEmptyArray(input)).toBe(true);
        });

        it.each<[string, Array<unknown>]>([
            ['non-empty array', [1, 2, 3]],
            ['single-element array', [1]],
            ['array with null values', [null, undefined]],
            ['array with 0', [0]],
            ['array with false', [false]],
            ['array with empty string', ['']]
        ])('returns false for %s', (_, input) => {
            expect(isEmptyArray(input)).toBe(false);
        });

        it('narrows type to null | undefined | [] on true branch', () => {
            expect.assertions(1);
            const value: Array<number> | null | undefined = null;
            if (isEmptyArray(value)) {
                // compile-time check: if narrowing breaks, this assignment won't compile
                const _narrowed: null | undefined | [] = value;
                expect(_narrowed).toBeNull();
            }
        });
    });

    describe('isNonEmptyArray', () => {
        it.each<[string, null | undefined | Array<unknown>]>([
            ['null', null],
            ['undefined', undefined],
            ['empty array', []]
        ])('returns false for %s', (_, input) => {
            expect(isNonEmptyArray(input)).toBe(false);
        });

        it.each<[string, Array<unknown>]>([
            ['non-empty array', [1, 2, 3]],
            ['single-element array', [1]],
            ['array with null values', [null, undefined]]
        ])('returns true for %s', (_, input) => {
            expect(isNonEmptyArray(input)).toBe(true);
        });

        it('narrows type to Array<T> on true branch', () => {
            expect.assertions(1);
            const value: Array<number> | null | undefined = [1, 2];
            if (isNonEmptyArray(value)) {
                const _narrowed: Array<number | null | undefined> = value;
                expect(_narrowed).toEqual([1, 2]);
            }
        });
    });

    describe('arrayToUint8Array', () => {
        it('returns the same Uint8Array instance when input is already Uint8Array', () => {
            const input = new Uint8Array([1, 2, 3]);
            expect(arrayToUint8Array(input)).toBe(input);
        });

        it('converts number array to Uint8Array', () => {
            const result = arrayToUint8Array([1, 2, 3]);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(Array.from(result)).toEqual([1, 2, 3]);
        });

        it('converts empty array to empty Uint8Array', () => {
            const result = arrayToUint8Array([]);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(result).toHaveLength(0);
        });
    });

    describe('sortArrayByComparators', () => {
        it('returns input unchanged when called with zero comparators', () => {
            expect(sortArrayByComparators([3, 1, 2])).toEqual([3, 1, 2]);
        });

        it('sorts with a single comparator', () => {
            expect(sortArrayByComparators([3, 1, 2], (a, b) => a - b)).toEqual([1, 2, 3]);
        });

        it('sorts with multiple comparators (primary then secondary)', () => {
            const input = [
                {a: 1, b: 2},
                {a: 1, b: 1},
                {a: 2, b: 1}
            ];
            expect(
                sortArrayByComparators(
                    input,
                    (x, y) => x.a - y.a,
                    (x, y) => x.b - y.b
                )
            ).toEqual([
                {a: 1, b: 1},
                {a: 1, b: 2},
                {a: 2, b: 1}
            ]);
        });

        it('maintains original order when all comparators return 0', () => {
            expect(sortArrayByComparators([1, 2, 3], () => 0)).toEqual([1, 2, 3]);
        });
    });

    describe('sortArrayByValues', () => {
        it('returns input unchanged when called with zero extractors', () => {
            expect(sortArrayByValues([3, 1, 2])).toEqual([3, 1, 2]);
        });

        it('sorts by a single value extractor (numbers)', () => {
            expect(sortArrayByValues([{value: 3}, {value: 1}, {value: 2}], (item) => item.value)).toEqual([{value: 1}, {value: 2}, {value: 3}]);
        });

        it('sorts by a single value extractor (strings)', () => {
            expect(sortArrayByValues(['banana', 'apple', 'cherry'], (item) => item)).toEqual(['apple', 'banana', 'cherry']);
        });

        it('sorts by multiple value extractors (primary then secondary)', () => {
            const input = [
                {name: 'B', age: 20},
                {name: 'A', age: 30},
                {name: 'A', age: 20}
            ];
            expect(
                sortArrayByValues(
                    input,
                    (item) => item.name,
                    (item) => item.age
                )
            ).toEqual([
                {name: 'A', age: 20},
                {name: 'A', age: 30},
                {name: 'B', age: 20}
            ]);
        });
    });
});
