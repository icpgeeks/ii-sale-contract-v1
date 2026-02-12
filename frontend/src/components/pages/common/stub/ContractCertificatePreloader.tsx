import {isNullish} from '@dfinity/utils';
import {useCurrentCanisterIdContext} from 'frontend/src/context/canisterId/CurrentCanisterIdProvider';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {useEffect} from 'react';

export const ContractCertificatePreloader = () => {
    const {currentCanisterId} = useCurrentCanisterIdContext();
    const {fetchContractCertificate} = useContractCertificateContext();

    useEffect(() => {
        if (isNullish(currentCanisterId)) {
            return;
        }
        fetchContractCertificate();
    }, [fetchContractCertificate, currentCanisterId]);

    return null;
};
