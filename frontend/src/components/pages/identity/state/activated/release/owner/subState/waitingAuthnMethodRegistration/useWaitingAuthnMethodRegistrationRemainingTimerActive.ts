import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {getSafeTimerTimeoutTillUTCMillis} from 'frontend/src/utils/core/timer/timer';
import {useEffect, useMemo, useState} from 'react';

export const useWaitingAuthnMethodRegistrationRemainingTimerActive = () => {
    const {getSubStateValue} = useIdentityHolderStateContext();
    const releaseSubState = useMemo(() => getSubStateValue('Release', 'WaitingAuthnMethodRegistration'), [getSubStateValue]);
    const expiration = releaseSubState?.expiration;

    const [timerActive, setTimerActive] = useState<boolean>(() => getSafeTimerTimeoutTillUTCMillis(expiration) > 0);

    useEffect(() => {
        const remainingMillis = getSafeTimerTimeoutTillUTCMillis(expiration);
        if (remainingMillis <= 0) {
            setTimerActive(false);
            return;
        }
        const timerId = window.setTimeout(() => {
            setTimerActive(false);
        }, remainingMillis);
        return () => {
            window.clearTimeout(timerId);
        };
    }, [expiration]);

    return timerActive;
};
