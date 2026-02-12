import {ErrorAlertWithAction} from 'frontend/src/components/widgets/alert/ErrorAlertWithAction';
import {i18} from 'frontend/src/i18';
import {RetryFetchContractCertificateButton} from './RetryFetchContractCertificateButton';

export const ContractCertificateLoadingErrorPanel = () => {
    return <ErrorAlertWithAction message={i18.contractCertificate.stub.error.title} action={<RetryFetchContractCertificateButton />} large />;
};
