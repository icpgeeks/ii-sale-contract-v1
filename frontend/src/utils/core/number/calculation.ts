/**
 * Sum an array of bigints, returning the sum if all numbers are defined, or undefined otherwise.
 * @param values
 */
export const sumOfBigintsIfAllDefined = (...values: Array<bigint | undefined>): bigint | undefined => {
    if (values.length == 0) {
        return undefined;
    }
    const allAreDefined = values.every((value): value is bigint => value != undefined);
    if (!allAreDefined) {
        return undefined;
    }
    return values.reduce((acc, value) => acc + value, 0n);
};

/**
 * Calculate the percentage difference between two bigint values.
 * @param value1 The first bigint value.
 * @param value2 The second bigint value.
 * @param precision The number of decimal places to include in the result.
 * @returns The percentage difference as a number, or undefined if the inputs are invalid.
 * @example calculatePercentageDifferenceUnsafe(120n, 100n, 2) => 20.0
 * @example calculatePercentageDifferenceUnsafe(100n, 120n, 2) => -20.0
 */
export const calculatePercentageDifferenceUnsafe = (value1: bigint, value2: bigint, precision: number = 2): number | undefined => {
    if (value1 < 0n || value2 <= 0n) {
        return undefined;
    }
    return Number(((value1 - value2) * BigInt(10 ** (precision + 2))) / value2) / 10 ** precision;
};
