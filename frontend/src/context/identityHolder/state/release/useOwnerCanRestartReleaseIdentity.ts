import {isNullish} from '@dfinity/utils';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {useMemo} from 'react';

type Result = {ownerCanRestartReleaseIdentity: boolean; ownerCanSeeRestartReleaseIdentityAction: boolean};
export const useOwnerCanRestartReleaseIdentity = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    const {getStateUnion} = useIdentityHolderStateContext();
    const releaseStateUnion = useMemo(() => getStateUnion('Release'), [getStateUnion]);

    return useMemo<Result>(() => {
        const defaultResult: Result = {ownerCanRestartReleaseIdentity: false, ownerCanSeeRestartReleaseIdentityAction: false};
        if (!isOwnedByCurrentUser) {
            return defaultResult;
        }
        const type = releaseStateUnion?.type;
        if (isNullish(type)) {
            return defaultResult;
        }
        switch (type) {
            case 'CheckingAccessFromOwnerAuthnMethod':
            case 'WaitingAuthnMethodRegistration':
            case 'ReleaseFailed':
                return {ownerCanRestartReleaseIdentity: true, ownerCanSeeRestartReleaseIdentityAction: true};
            case 'ConfirmAuthnMethodRegistration':
                return {ownerCanRestartReleaseIdentity: false, ownerCanSeeRestartReleaseIdentityAction: true};
            case 'DangerousToLoseIdentity':
            case 'IdentityAPIChanged':
            case 'DeleteHolderAuthnMethod':
            case 'EnsureOrphanedRegistrationExited':
            case 'EnterAuthnMethodRegistrationMode':
            case 'StartRelease': {
                return defaultResult;
            }
            default: {
                const exhaustiveCheck: never = type;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                return defaultResult;
            }
        }
    }, [isOwnedByCurrentUser, releaseStateUnion?.type]);
};
