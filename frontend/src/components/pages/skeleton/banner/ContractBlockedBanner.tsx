import {fromNullable, isNullish, nonNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {HubContractTemplateProvider, useHubContractTemplateContext} from 'frontend/src/context/hub/HubContractTemplateProvider';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';

export const ContractBlockedBanner = () => {
    const {contractCertificate} = useContractCertificateContext();

    const [hubCanisterId, contractTemplateId] = useMemo<[string | undefined, bigint | undefined]>(() => {
        if (isNullish(contractCertificate)) {
            return [undefined, undefined];
        }
        return [contractCertificate.hub_canister.toText(), contractCertificate.contract_template_id];
    }, [contractCertificate]);

    if (isNullish(hubCanisterId) || isNullish(contractTemplateId)) {
        return null;
    }

    return (
        <HubContractTemplateProvider hubCanisterId={hubCanisterId} contractTemplateId={contractTemplateId}>
            <Content />
        </HubContractTemplateProvider>
    );
};

const Content = () => {
    const {data: hubContractTemplate} = useHubContractTemplateContext();

    const isBlocked = useMemo(() => {
        if (isNullish(hubContractTemplate)) {
            return false;
        }
        const blocked = fromNullable(hubContractTemplate.contract_template.blocked);
        return nonNullish(blocked);
    }, [hubContractTemplate]);

    if (!isBlocked) {
        return null;
    }

    return (
        <div className="skBanner">
            <ErrorAlert
                message={
                    <div>
                        <Flex justify="space-between" gap={8}>
                            <div className="gf-strong">{i18.banner.contractBlocked.title}</div>
                            <ExternalLinkToFAQAsQuestionMark fragment="template-blocked" />
                        </Flex>
                        <div>{i18.banner.contractBlocked.description}</div>
                    </div>
                }
                large
            />
        </div>
    );
};
