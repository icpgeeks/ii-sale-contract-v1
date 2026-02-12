import {describe, expect, it} from 'vitest';
import {millisToTime} from './utils';

describe('millisToTime', () => {
    it('should convert 0 milliseconds to 00:00', () => {
        const result = millisToTime(0);
        expect(result).toEqual({minutes: '00', seconds: '00'});
    });

    it('should convert 1000 milliseconds to 00:01', () => {
        const result = millisToTime(1000);
        expect(result).toEqual({minutes: '00', seconds: '01'});
    });

    it('should convert 60000 milliseconds (1 minute) to 01:00', () => {
        const result = millisToTime(60000);
        expect(result).toEqual({minutes: '01', seconds: '00'});
    });

    it('should convert 90000 milliseconds (1 minute 30 seconds) to 01:30', () => {
        const result = millisToTime(90000);
        expect(result).toEqual({minutes: '01', seconds: '30'});
    });

    it('should pad single digit seconds with leading zero', () => {
        const result = millisToTime(5000);
        expect(result).toEqual({minutes: '00', seconds: '05'});
    });

    it('should pad single digit minutes with leading zero', () => {
        const result = millisToTime(300000);
        expect(result).toEqual({minutes: '05', seconds: '00'});
    });

    it('should handle large values correctly', () => {
        const result = millisToTime(3661000);
        expect(result).toEqual({minutes: '61', seconds: '01'});
    });

    it('should handle 10 minutes exactly', () => {
        const result = millisToTime(600000);
        expect(result).toEqual({minutes: '10', seconds: '00'});
    });

    it('should handle 99 minutes and 59 seconds', () => {
        const result = millisToTime(5999000);
        expect(result).toEqual({minutes: '99', seconds: '59'});
    });

    it('should floor fractional seconds', () => {
        const result = millisToTime(1999);
        expect(result).toEqual({minutes: '00', seconds: '01'});
    });

    it('should handle small millisecond values that round to 0 seconds', () => {
        const result = millisToTime(999);
        expect(result).toEqual({minutes: '00', seconds: '00'});
    });

    it('should handle 2 hours correctly', () => {
        const result = millisToTime(7200000);
        expect(result).toEqual({minutes: '120', seconds: '00'});
    });

    it('should convert 125 seconds to 02:05', () => {
        const result = millisToTime(125000);
        expect(result).toEqual({minutes: '02', seconds: '05'});
    });
});
