import {isNullish} from '@dfinity/utils';
import {LoadingAndFailedToLoadValueWrapper} from 'frontend/src/components/widgets/alert/LoadingAndFailedToLoadValueWrapper';
import {CopyableUIDComponent} from 'frontend/src/components/widgets/uid/CopyableUIDComponent';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {useMemo} from 'react';

export const Deployer = () => {
    const {feature, contractCertificate, fetchContractCertificate} = useContractCertificateContext();
    const {inProgress, loaded} = feature.status;
    const principal = useMemo(() => contractCertificate?.deployer.toText(), [contractCertificate?.deployer]);

    if (isNullish(principal)) {
        return <LoadingAndFailedToLoadValueWrapper loaded={loaded} isError inProgress={inProgress} action={fetchContractCertificate} />;
    }
    return <CopyableUIDComponent uid={principal} />;
};
