import {describe, expect, it} from 'vitest';
import {buildPairURL, extractRegistrationId, INTERNET_IDENTITY_PAIR_ORIGIN, INTERNET_IDENTITY_PAIR_PATH, INTERNET_IDENTITY_PAIR_REGISTRATION_ID_LENGTH} from './registrationIdUtils';

const validId = 'a'.repeat(INTERNET_IDENTITY_PAIR_REGISTRATION_ID_LENGTH);
const validUrl = `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#${validId}`;

describe('registrationIdUtils', () => {
    describe('extractRegistrationId', () => {
        it.each<[string, string, string]>([
            ['repeated letters', validUrl, validId],
            ['numeric ID', `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#12345`, '12345'],
            ['lowercase alphanumeric', `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#abc12`, 'abc12'],
            ['uppercase alphanumeric', `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#ABC12`, 'ABC12'],
            ['mixed case', `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#aB3Xy`, 'aB3Xy'],
            ['URL with surrounding whitespace', `  ${validUrl}  `, validId]
        ])('extracts ID from %s', (_, url, expected) => {
            expect(extractRegistrationId(url)).toBe(expected);
        });

        it.each<[string, string | undefined]>([
            ['undefined', undefined],
            ['empty string', ''],
            ['whitespace-only string', '   '],
            ['incorrect origin', `https://wrong-origin.com${INTERNET_IDENTITY_PAIR_PATH}#${validId}`],
            ['incorrect path', `${INTERNET_IDENTITY_PAIR_ORIGIN}/wrong-path#${validId}`],
            ['missing hash', `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}`],
            ['ID too short (4 chars)', `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#AB12`],
            ['ID too long (6 chars)', `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#AB1234`],
            ['ID with special characters', `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#AB-12`],
            ['ID with spaces', `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#AB 12`],
            ['URL without protocol', `id.ai${INTERNET_IDENTITY_PAIR_PATH}#${validId}`],
            ['completely malformed URL', 'not-a-url'],
            ['URL with query parameters', `${validUrl}?param=value`],
            ['URL with additional path segments', `${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}/extra#${validId}`]
        ])('returns undefined for %s', (_, input) => {
            expect(extractRegistrationId(input)).toBeUndefined();
        });
    });

    describe('buildPairURL', () => {
        it('builds correct pair URL', () => {
            expect(buildPairURL('abc12')).toBe(`${INTERNET_IDENTITY_PAIR_ORIGIN}${INTERNET_IDENTITY_PAIR_PATH}#abc12`);
        });
    });
});
