import {useNeedConfirmAuthnMethodSessionRegistrationDataContext} from './NeedConfirmAuthnMethodSessionRegistrationDataProvider';
import {TimerActiveContent} from './timerActive/TimerActiveContent';
import {TimerExpiredContent} from './timerExpired/TimerExpiredContent';

export const NeedConfirmAuthnMethodSessionRegistrationPanel = () => {
    const {timerActive, actionInProgress} = useNeedConfirmAuthnMethodSessionRegistrationDataContext();
    if (timerActive || actionInProgress) {
        return <TimerActiveContent />;
    }
    return <TimerExpiredContent />;
};
