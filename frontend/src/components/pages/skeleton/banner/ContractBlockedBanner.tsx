import type {Principal} from '@dfinity/principal';
import {fromNullable, isNullish, nonNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {HubContractBlockStatusProvider, useHubContractBlockStatusContext} from 'frontend/src/context/hub/HubContractBlockStatusProvider';
import {HubContractTemplateProvider, useHubContractTemplateContext} from 'frontend/src/context/hub/HubContractTemplateProvider';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';

export const ContractBlockedBanner = () => {
    const {contractCertificate} = useContractCertificateContext();

    const [hubCanisterId, contractTemplateId, contractCanisterId] = useMemo<[string | undefined, bigint | undefined, Principal | undefined]>(() => {
        if (isNullish(contractCertificate)) {
            return [undefined, undefined, undefined];
        }
        return [contractCertificate.hub_canister.toText(), contractCertificate.contract_template_id, contractCertificate.contract_canister];
    }, [contractCertificate]);

    if (isNullish(hubCanisterId) || isNullish(contractTemplateId) || isNullish(contractCanisterId)) {
        return null;
    }

    return (
        <HubContractTemplateProvider key={`${hubCanisterId}:${contractTemplateId}:${contractCanisterId.toText()}`} hubCanisterId={hubCanisterId} contractTemplateId={contractTemplateId}>
            <HubContractBlockStatusProvider hubCanisterId={hubCanisterId} contractCanisterId={contractCanisterId}>
                <Content />
            </HubContractBlockStatusProvider>
        </HubContractTemplateProvider>
    );
};

const Content = () => {
    const {hubContractTemplate} = useHubContractTemplateContext();
    const {hubContractBlockStatus} = useHubContractBlockStatusContext();

    const isBlocked = useMemo(() => {
        const templateBlocked = nonNullish(hubContractTemplate.data) && nonNullish(fromNullable(hubContractTemplate.data.contract_template.blocked));
        const contractBlocked = nonNullish(hubContractBlockStatus.data) && nonNullish(fromNullable(hubContractBlockStatus.data.blocked));
        return templateBlocked || contractBlocked;
    }, [hubContractTemplate.data, hubContractBlockStatus.data]);

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
