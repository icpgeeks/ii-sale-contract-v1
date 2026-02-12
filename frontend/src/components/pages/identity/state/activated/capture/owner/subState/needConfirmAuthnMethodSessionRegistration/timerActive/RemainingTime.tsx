import {useNeedConfirmAuthnMethodSessionRegistrationRemainingTime} from './useNeedConfirmAuthnMethodSessionRegistrationRemainingTime';

export const RemainingTime = () => {
    const remainingTime = useNeedConfirmAuthnMethodSessionRegistrationRemainingTime();

    if (!remainingTime) {
        return null;
    }

    return `${remainingTime.minutes}:${remainingTime.seconds}`;
};
