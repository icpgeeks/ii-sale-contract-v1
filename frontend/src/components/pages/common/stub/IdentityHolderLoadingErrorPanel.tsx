import {ErrorAlertWithAction} from 'frontend/src/components/widgets/alert/ErrorAlertWithAction';
import {i18} from 'frontend/src/i18';
import {RetryFetchHolderButton} from './RetryFetchHolderButton';

export const IdentityHolderLoadingErrorPanel = () => {
    return <ErrorAlertWithAction message={i18.holder.stub.error.title} action={<RetryFetchHolderButton />} large />;
};
