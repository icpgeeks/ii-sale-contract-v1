import {isNullish} from '@dfinity/utils';
import {LoadingAndFailedToLoadValueWrapper} from 'frontend/src/components/widgets/alert/LoadingAndFailedToLoadValueWrapper';
import {CopyableUIDComponent} from 'frontend/src/components/widgets/uid/CopyableUIDComponent';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {useMemo} from 'react';

export const HubCanisterId = () => {
    const {feature, contractCertificate, fetchContractCertificate} = useContractCertificateContext();
    const {inProgress, loaded} = feature.status;
    const canisterId = useMemo(() => contractCertificate?.hub_canister.toText(), [contractCertificate?.hub_canister]);

    if (isNullish(canisterId)) {
        return <LoadingAndFailedToLoadValueWrapper loaded={loaded} isError inProgress={inProgress} action={fetchContractCertificate} />;
    }
    return <CopyableUIDComponent uid={canisterId} />;
};
