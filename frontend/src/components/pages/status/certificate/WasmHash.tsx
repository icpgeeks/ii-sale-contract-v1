import {isNullish} from '@dfinity/utils';
import {LoadingAndFailedToLoadValueWrapper} from 'frontend/src/components/widgets/alert/LoadingAndFailedToLoadValueWrapper';
import {CopyableUIDComponent} from 'frontend/src/components/widgets/uid/CopyableUIDComponent';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';

export const WasmHash = () => {
    const {feature, contractCertificate, fetchContractCertificate} = useContractCertificateContext();
    const {inProgress, loaded} = feature.status;
    const wasmHash = contractCertificate?.contract_wasm_hash;

    if (isNullish(wasmHash)) {
        return <LoadingAndFailedToLoadValueWrapper loaded={loaded} isError inProgress={inProgress} action={fetchContractCertificate} />;
    }
    return <CopyableUIDComponent uid={wasmHash} />;
};
