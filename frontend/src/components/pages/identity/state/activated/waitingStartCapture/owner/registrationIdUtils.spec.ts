import {describe, expect, it} from 'vitest';
import {extractRegistrationId, INTERNET_IDENTITY_PAIR_ORIGIN, INTERNET_IDENTITY_PAIR_PATH, INTERNET_IDENTITY_PAIR_REGISTRATION_ID_LENGTH} from './registrationIdUtils';

describe('extractRegistrationId', () => {
    const validRegistrationId = 'a'.repeat(INTERNET_IDENTITY_PAIR_REGISTRATION_ID_LENGTH);
    const validPairURL = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${validRegistrationId}`;

    describe('successful extraction', () => {
        it('should extract registration ID from a valid pair URL', () => {
            const result = extractRegistrationId(validPairURL);

            expect(result).toBe(validRegistrationId);
        });

        it('should extract numeric registration IDs', () => {
            const numericId = '12345';
            const url = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${numericId}`;
            const result = extractRegistrationId(url);

            expect(result).toBe(numericId);
        });

        it('should extract lowercase alphanumeric registration IDs', () => {
            const lowercaseId = 'abc12';
            const url = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${lowercaseId}`;
            const result = extractRegistrationId(url);

            expect(result).toBe(lowercaseId);
        });

        it('should extract uppercase alphanumeric registration IDs', () => {
            const uppercaseId = 'ABC12';
            const url = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${uppercaseId}`;
            const result = extractRegistrationId(url);

            expect(result).toBe(uppercaseId);
        });

        it('should extract mixed case alphanumeric registration IDs', () => {
            const mixedId = 'aB3Xy';
            const url = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${mixedId}`;
            const result = extractRegistrationId(url);

            expect(result).toBe(mixedId);
        });

        it('should trim whitespace before extracting', () => {
            const urlWithSpaces = `  ${validPairURL}  `;
            const result = extractRegistrationId(urlWithSpaces);

            expect(result).toBe(validRegistrationId);
        });
    });

    describe('failed extraction', () => {
        it('should return undefined for undefined input', () => {
            const result = extractRegistrationId(undefined);

            expect(result).toBeUndefined();
        });

        it('should return undefined for empty string', () => {
            const result = extractRegistrationId('');

            expect(result).toBeUndefined();
        });

        it('should return undefined for whitespace-only string', () => {
            const result = extractRegistrationId('   ');

            expect(result).toBeUndefined();
        });

        it('should return undefined for incorrect origin', () => {
            const incorrectURL = `https://wrong-origin.com${INTERNET_IDENTITY_PAIR_PATH}#${validRegistrationId}`;
            const result = extractRegistrationId(incorrectURL);

            expect(result).toBeUndefined();
        });

        it('should return undefined for incorrect path', () => {
            const incorrectURL = `${INTERNET_IDENTITY_PAIR_ORIGIN}/wrong-path#${validRegistrationId}`;
            const result = extractRegistrationId(incorrectURL);

            expect(result).toBeUndefined();
        });

        it('should return undefined for missing hash', () => {
            const incorrectURL = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}`;
            const result = extractRegistrationId(incorrectURL);

            expect(result).toBeUndefined();
        });

        it('should return undefined for registration ID that is too short', () => {
            const shortId = 'AB12';
            const incorrectURL = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${shortId}`;
            const result = extractRegistrationId(incorrectURL);

            expect(result).toBeUndefined();
        });

        it('should return undefined for registration ID that is too long', () => {
            const longId = 'AB1234';
            const incorrectURL = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${longId}`;
            const result = extractRegistrationId(incorrectURL);

            expect(result).toBeUndefined();
        });

        it('should return undefined for registration ID with special characters', () => {
            const specialId = 'AB-12';
            const incorrectURL = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${specialId}`;
            const result = extractRegistrationId(incorrectURL);

            expect(result).toBeUndefined();
        });

        it('should return undefined for registration ID with spaces', () => {
            const spaceId = 'AB 12';
            const incorrectURL = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${spaceId}`;
            const result = extractRegistrationId(incorrectURL);

            expect(result).toBeUndefined();
        });

        it('should return undefined for URL without protocol', () => {
            const noProtocol = `id.ai${INTERNET_IDENTITY_PAIR_PATH}#${validRegistrationId}`;
            const result = extractRegistrationId(noProtocol);

            expect(result).toBeUndefined();
        });

        it('should return undefined for completely malformed URL', () => {
            const result = extractRegistrationId('not-a-url');

            expect(result).toBeUndefined();
        });

        it('should return undefined for URL with query parameters', () => {
            const urlWithQuery = `${validPairURL}?param=value`;
            const result = extractRegistrationId(urlWithQuery);

            expect(result).toBeUndefined();
        });

        it('should return undefined for URL with additional path segments', () => {
            const urlWithExtra = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}/extra#${validRegistrationId}`;
            const result = extractRegistrationId(urlWithExtra);

            expect(result).toBeUndefined();
        });
    });
});
