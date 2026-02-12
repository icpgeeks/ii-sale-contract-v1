import {isNullish} from '@dfinity/utils';
import {getDurationTillUTCMillisUnsafe} from 'frontend/src/utils/core/date/duration';

export const millisToTime = (
    millis: number
): {
    minutes: string;
    seconds: string;
} => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return {
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0')
    };
};

export const calculateRemainingTime = (expiration: bigint | undefined) => {
    if (isNullish(expiration)) {
        return undefined;
    }
    const remainingMillis = getDurationTillUTCMillisUnsafe(expiration);
    if (remainingMillis <= 0) {
        return undefined;
    }
    return millisToTime(remainingMillis);
};
