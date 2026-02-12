import {Flex} from 'antd';
import {KeyValueVertical} from 'frontend/src/components/widgets/KeyValueVertical';
import {i18} from 'frontend/src/i18';
import {CanisterId} from './CanisterId';
import {CertificateExpirationDate} from './CertificateExpirationDate';
import {Deployer} from './Deployer';
import {HubCanisterId} from './HubCanisterId';
import {WasmHash} from './WasmHash';

export const CertificateDetails = () => {
    return (
        <Flex vertical gap={8}>
            <KeyValueVertical label={i18.status.certificate.expirationDate} value={<CertificateExpirationDate />} />
            <KeyValueVertical label={i18.status.certificate.contractCanisterId} value={<CanisterId />} />
            <KeyValueVertical label={i18.status.certificate.hubCanisterId} value={<HubCanisterId />} />
            <KeyValueVertical label={i18.status.certificate.deployedBy} value={<Deployer />} />
            <KeyValueVertical label={i18.status.certificate.contractWasmHash} value={<WasmHash />} />
        </Flex>
    );
};
