import {getDurationTillUTCMillisUnsafe} from 'frontend/src/utils/core/date/duration';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {calculateRemainingTime, millisToTime} from './utils';

vi.mock('frontend/src/utils/core/date/duration');

describe('utils', () => {
    describe('millisToTime', () => {
        it.each([
            {millis: 0, expected: {minutes: '00', seconds: '00'}},
            {millis: 1000, expected: {minutes: '00', seconds: '01'}},
            {millis: 5000, expected: {minutes: '00', seconds: '05'}},
            {millis: 60000, expected: {minutes: '01', seconds: '00'}},
            {millis: 90000, expected: {minutes: '01', seconds: '30'}},
            {millis: 125000, expected: {minutes: '02', seconds: '05'}},
            {millis: 300000, expected: {minutes: '05', seconds: '00'}},
            {millis: 600000, expected: {minutes: '10', seconds: '00'}},
            {millis: 3661000, expected: {minutes: '61', seconds: '01'}},
            {millis: 5999000, expected: {minutes: '99', seconds: '59'}},
            {millis: 7200000, expected: {minutes: '120', seconds: '00'}},
            {millis: 1999, expected: {minutes: '00', seconds: '01'}},
            {millis: 999, expected: {minutes: '00', seconds: '00'}}
        ])('converts $millis ms → $expected', ({millis, expected}) => {
            expect(millisToTime(millis)).toEqual(expected);
        });
    });

    describe('calculateRemainingTime', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('returns undefined for undefined expiration', () => {
            expect(calculateRemainingTime(undefined)).toBeUndefined();
        });

        it('returns undefined when remaining millis is zero', () => {
            vi.mocked(getDurationTillUTCMillisUnsafe).mockReturnValueOnce(0);
            expect(calculateRemainingTime(12345n)).toBeUndefined();
        });

        it('returns undefined when remaining millis is negative', () => {
            vi.mocked(getDurationTillUTCMillisUnsafe).mockReturnValueOnce(-1);
            expect(calculateRemainingTime(12345n)).toBeUndefined();
        });

        it('returns formatted time when remaining millis is positive', () => {
            vi.mocked(getDurationTillUTCMillisUnsafe).mockReturnValueOnce(90000);
            expect(calculateRemainingTime(12345n)).toEqual({minutes: '01', seconds: '30'});
        });
    });
});
