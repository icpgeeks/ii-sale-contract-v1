import {isNullish} from '@dfinity/utils';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {getHolderProcessingError} from 'frontend/src/context/identityHolder/identityHolderUtils';
import {i18} from 'frontend/src/i18';
import {jsonStringify} from 'frontend/src/utils/core/json/json';
import {IS_DEBUG_ENABLED} from 'frontend/src/utils/env';
import {useMemo} from 'react';

export const HolderProcessingErrorPanel = () => {
    const {holder} = useIdentityHolderContext();

    return useMemo(() => {
        const holderProcessingError = getHolderProcessingError(holder?.processing_error);
        if (isNullish(holderProcessingError)) {
            return null;
        }
        const message = <ErrorMessageText message={i18.common.error.processingError} errorDebugContext={IS_DEBUG_ENABLED ? jsonStringify(holderProcessingError) : undefined} />;
        return <ErrorAlert message={message} />;
    }, [holder?.processing_error]);
};
