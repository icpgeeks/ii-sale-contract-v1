import {isNullish} from '@dfinity/utils';
import {SimpleSteps} from 'frontend/src/components/pages/common/SimpleSteps';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {useMemo} from 'react';

type Step = 0 | 1 | 2;

export const ReleaseStepsRow = () => {
    const {getStateUnion} = useIdentityHolderStateContext();
    const releaseStateUnion = getStateUnion('Release');

    const releaseSubStateType = releaseStateUnion?.type;

    const currentStep = useMemo<Step | undefined>(() => {
        if (isNullish(releaseSubStateType)) {
            return undefined;
        }
        switch (releaseSubStateType) {
            case 'StartRelease':
            case 'EnterAuthnMethodRegistrationMode':
            case 'EnsureOrphanedRegistrationExited':
            case 'ReleaseFailed': {
                return 0;
            }
            case 'WaitingAuthnMethodRegistration':
            case 'ConfirmAuthnMethodRegistration': {
                return 1;
            }
            case 'CheckingAccessFromOwnerAuthnMethod': {
                return 2;
            }
            case 'DangerousToLoseIdentity':
            case 'IdentityAPIChanged': {
                // illegal state - we should not reach here
                // this case in handled separately in capture flow
                return undefined;
            }
            case 'DeleteHolderAuthnMethod': {
                // illegal state - we should not reach here
                // this case in handled separately in "DeleteHolderAuthnMethodPanel"
                return undefined;
            }
            default: {
                const exhaustiveCheck: never = releaseSubStateType;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                return undefined;
            }
        }
    }, [releaseSubStateType]);

    if (isNullish(currentStep)) {
        return null;
    }

    return <ReleaseStepsRowRaw current={currentStep} />;
};

export const ReleaseStepsRowRaw = ({current}: {current: number}) => {
    return <SimpleSteps total={3} current={current} />;
};
