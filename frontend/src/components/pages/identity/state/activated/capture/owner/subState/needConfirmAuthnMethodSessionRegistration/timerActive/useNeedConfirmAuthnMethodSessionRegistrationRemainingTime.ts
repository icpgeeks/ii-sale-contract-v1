import {isNullish} from '@dfinity/utils';
import {useEffect, useState} from 'react';
import {useNeedConfirmAuthnMethodSessionRegistrationDataContext} from '../NeedConfirmAuthnMethodSessionRegistrationDataProvider';
import type {millisToTime} from '../utils';
import {calculateRemainingTime} from '../utils';

export const useNeedConfirmAuthnMethodSessionRegistrationRemainingTime = () => {
    const {expirationTimeMillis} = useNeedConfirmAuthnMethodSessionRegistrationDataContext();
    const [timeRemaining, setTimeRemaining] = useState<ReturnType<typeof millisToTime> | undefined>(() => calculateRemainingTime(expirationTimeMillis));

    useEffect(() => {
        const interval = setInterval(() => {
            const result = calculateRemainingTime(expirationTimeMillis);
            if (isNullish(result)) {
                clearInterval(interval);
                setTimeRemaining(undefined);
            } else {
                setTimeRemaining(result);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expirationTimeMillis]);

    return timeRemaining;
};
