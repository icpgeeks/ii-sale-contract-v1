import {fromNullishNullable, isNullish} from '@dfinity/utils';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {i18} from 'frontend/src/i18';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {HolderProcessingErrorPanel} from '../../HolderProcessingErrorPanel';

export const ConfirmAuthnMethodRegistrationErrorPanel = () => {
    const {getSubStateValue} = useIdentityHolderStateContext();
    const waitingAuthnMethodRegistrationSubStateValue = getSubStateValue('Release', 'WaitingAuthnMethodRegistration');
    const confirmAuthnMethodRegistrationError = fromNullishNullable(waitingAuthnMethodRegistrationSubStateValue?.confirm_error);

    if (isNullish(confirmAuthnMethodRegistrationError)) {
        return <HolderProcessingErrorPanel />;
    }

    const message = (
        <ErrorMessageText
            message={i18.holder.state.release.waitingAuthnMethodRegistration.stub.authnMethodRegistrationWrongCode}
            errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(confirmAuthnMethodRegistrationError) : undefined}
        />
    );
    return <ErrorAlert message={message} />;
};
