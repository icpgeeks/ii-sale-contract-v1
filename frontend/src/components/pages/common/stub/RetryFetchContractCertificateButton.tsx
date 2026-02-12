import {AlertActionButton} from 'frontend/src/components/widgets/alert/AlertActionButton';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';

export const RetryFetchContractCertificateButton = () => {
    const {feature, fetchContractCertificate} = useContractCertificateContext();
    const inProgress = feature.status.inProgress;
    return <AlertActionButton onClick={fetchContractCertificate} loading={inProgress} />;
};
