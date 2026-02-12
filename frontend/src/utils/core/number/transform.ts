export const parseStringToNumber = (str: string): number | undefined => {
    const num = parseFloat(str);
    return Number.isFinite(num) ? num : undefined;
};

export const isValidPositiveNumber = (num: number): boolean => {
    return Number.isFinite(num) && num >= 0 && num <= Number.MAX_SAFE_INTEGER;
};

const isValidPositiveInteger = (num: number): boolean => {
    return isValidPositiveNumber(num) && Number.isInteger(num);
};

/**
 * Configuration options for extracting valid positive integers from input.
 */
type ExtractValidPositiveIntegerOptions = {
    /**
     * Determines the strictness of integer validation.
     *
     * When `true`, the input must be a string containing only digits (0-9).
     * No decimal points, scientific notation, leading/trailing whitespace,
     * or other numeric formats are allowed.
     *
     * @default false
     */
    exact?: boolean;
};

/**
 * Extracts a valid positive integer from a string or number input.
 * @param input - The input to extract the integer from (string or number).
 * @param options - Optional configuration object.
 * @returns The extracted integer if it is valid, otherwise undefined.
 */
export const extractValidPositiveInteger = (input: unknown, options?: ExtractValidPositiveIntegerOptions): number | undefined => {
    if (typeof input == 'number' && isValidPositiveInteger(input)) {
        return input;
    }

    if (typeof input == 'string') {
        const trimmed = input.trim();

        if (options?.exact && !/^\d+$/.test(trimmed)) {
            return undefined;
        }

        const parsed = parseStringToNumber(trimmed);

        if (parsed != undefined && isValidPositiveInteger(parsed)) {
            return parsed;
        }
    }

    return undefined;
};
