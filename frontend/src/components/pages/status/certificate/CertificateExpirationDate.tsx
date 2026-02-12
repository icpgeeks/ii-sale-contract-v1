import {isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {LoadingAndFailedToLoadValueWrapper} from 'frontend/src/components/widgets/alert/LoadingAndFailedToLoadValueWrapper';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {useDynamicTickForTargetTime} from 'frontend/src/hook/useDynamicTickForTargetTime';
import {formatDateTime} from 'frontend/src/utils/core/date/format';
import {ExpirationStatus} from './ExpirationStatus';

export const CertificateExpirationDate = () => {
    const {feature, contractCertificate, fetchContractCertificate} = useContractCertificateContext();
    const {inProgress, loaded} = feature.status;

    const {tick, targetTimeMillis: certificateWillExpireAtMillis} = useDynamicTickForTargetTime(contractCertificate?.expiration);

    if (isNullish(certificateWillExpireAtMillis) || feature.error.isError) {
        return <LoadingAndFailedToLoadValueWrapper loaded={loaded} isError inProgress={inProgress} action={fetchContractCertificate} />;
    }

    return (
        <Flex vertical>
            <span>{formatDateTime(certificateWillExpireAtMillis)}</span>
            <Flex gap={16} align="center">
                <ExpirationStatus key={tick} certificateWillExpireAtMillis={certificateWillExpireAtMillis} />
                <ExternalLinkToFAQAsQuestionMark fragment="contract-certificate" />
            </Flex>
        </Flex>
    );
};
