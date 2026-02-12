import {isNullish} from '@dfinity/utils';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {useMemo} from 'react';
import type {ReleaseError} from 'src/declarations/contract/contract.did';
import {HolderProcessingErrorPanel} from '../../HolderProcessingErrorPanel';

export const ReleaseFailedErrorPanel = () => {
    const {getSubStateValue} = useIdentityHolderStateContext();
    const releaseError = getSubStateValue('Release', 'ReleaseFailed')?.error;

    const errorMessage = useMemo(() => {
        if (isNullish(releaseError)) {
            return undefined;
        }
        return getHolderReleaseErrorMessage(releaseError);
    }, [releaseError]);

    if (isNullish(errorMessage)) {
        return <HolderProcessingErrorPanel />;
    }

    const message = <ErrorMessageText message={errorMessage} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(releaseError) : undefined} />;
    return <ErrorAlert message={message} />;
};

const getHolderReleaseErrorMessage = (error: ReleaseError): string => {
    const stateUnion = getSingleEntryUnion(error);
    if (isNullish(stateUnion)) {
        return i18.common.error.unableTo;
    }
    switch (stateUnion.type) {
        case 'HolderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered': {
            return i18.holder.state.release.releaseError.stub.holderAuthnMethodDeleteStopOwnerAuthnMethodNotRegistered;
        }
        case 'AuthnMethodRegistrationModeEnterAlreadyInProgress': {
            return i18.holder.state.release.releaseError.stub.authnMethodRegistrationModeEnterAlreadyInProgress;
        }
        case 'AuthnMethodRegistrationModeEnterInvalidRegistrationId': {
            // illegal state - we should not reach here
            // this case in handled separately in "ReleaseFailedPage"
            return i18.holder.state.release.releaseError.stub.authnMethodRegistrationModeEnterInvalidRegistrationId;
        }
        case 'AuthnMethodRegistrationExpired': {
            return i18.holder.state.release.releaseError.stub.authnMethodRegistrationExpired;
        }
        default: {
            const exhaustiveCheck: never = stateUnion;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return i18.common.error.unableTo;
        }
    }
};
