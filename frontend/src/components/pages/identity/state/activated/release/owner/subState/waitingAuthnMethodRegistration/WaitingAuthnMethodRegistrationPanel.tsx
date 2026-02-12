import {TimerActiveContent} from './timerActive/TimerActiveContent';
import {TimerExpiredContent} from './timerExpired/TimerExpiredContent';
import {useWaitingAuthnMethodRegistrationDataContext} from './WaitingAuthnMethodRegistrationDataProvider';

export const WaitingAuthnMethodRegistrationPanel = () => {
    const {timerActive, actionInProgress} = useWaitingAuthnMethodRegistrationDataContext();
    if (timerActive || actionInProgress) {
        return <TimerActiveContent />;
    }
    return <TimerExpiredContent />;
};
