import {isNullish, nonNullish} from '@dfinity/utils';

export const compactArray = <T>(array: Array<T | null | undefined>): Array<T> => {
    return array.filter(nonNullish);
};

export function isEmptyArray<T>(array: Array<T | null | undefined> | null | undefined): array is null | undefined | [] {
    return isNullish(array) || array.length == 0;
}

export const isNonEmptyArray = <T>(array: Array<T | null | undefined> | null | undefined): array is Array<T | null | undefined> => {
    return !isEmptyArray(array);
};

export const arrayToUint8Array = (bytes: Uint8Array | Array<number>): Uint8Array => {
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
};

export const sortArrayByComparators = <T>(array: Array<T>, ...sorters: Array<(a: T, b: T) => number>): Array<T> => {
    return array.sort((a, b) => {
        for (const sorter of sorters) {
            const result = sorter(a, b);
            if (result != 0) {
                return result;
            }
        }
        /**
         * If all sorters return 0, maintain original order
         */
        return 0;
    });
};

export const sortArrayByValues = <T>(array: Array<T>, ...valueExtractors: Array<(item: T) => any>): Array<T> => {
    return array.sort((a, b) => {
        for (const extractor of valueExtractors) {
            const valueA = extractor(a);
            const valueB = extractor(b);

            if (valueA < valueB) {
                return -1;
            }
            if (valueA > valueB) {
                return 1;
            }
        }
        return 0;
    });
};
