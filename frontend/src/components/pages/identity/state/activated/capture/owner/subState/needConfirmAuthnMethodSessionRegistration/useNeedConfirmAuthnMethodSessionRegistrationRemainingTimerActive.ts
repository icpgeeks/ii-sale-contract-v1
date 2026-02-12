import {isNullish, nonNullish} from '@dfinity/utils';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {getSafeTimerTimeoutTillUTCMillis} from 'frontend/src/utils/core/timer/timer';
import {useEffect, useMemo, useState} from 'react';

export const useNeedConfirmAuthnMethodSessionRegistrationRemainingTimerActive = () => {
    const {getSubStateValue} = useIdentityHolderStateContext();
    const captureSubState = useMemo(() => getSubStateValue('Capture', 'NeedConfirmAuthnMethodSessionRegistration'), [getSubStateValue]);
    const expiration = captureSubState?.expiration;
    const [timerActive, setTimerActive] = useState<boolean>(() => nonNullish(expiration) && getSafeTimerTimeoutTillUTCMillis(expiration) > 0);

    useEffect(() => {
        if (isNullish(expiration)) {
            setTimerActive(false);
            return;
        }
        const remainingMillis = getSafeTimerTimeoutTillUTCMillis(expiration);
        if (remainingMillis > 0) {
            const timerId = window.setTimeout(() => {
                setTimerActive(false);
            }, remainingMillis);
            return () => {
                window.clearTimeout(timerId);
            };
        }
    }, [expiration]);

    return timerActive;
};
