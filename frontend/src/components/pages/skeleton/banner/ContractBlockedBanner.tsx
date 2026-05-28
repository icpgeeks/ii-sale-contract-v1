import type {Principal} from '@dfinity/principal';
import {fromNullable, isNullish, nonNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {useCanisterContext} from 'frontend/src/context/canister/CanisterProvider';
import {HubContractTemplateProvider, useHubContractTemplateContext} from 'frontend/src/context/hub/HubContractTemplateProvider';
import {apiLogger} from 'frontend/src/context/logger/logger';
import {i18} from 'frontend/src/i18';
import {safeCall} from 'frontend/src/utils/ic/api/safeCall';
import type {GetContractBlockStatusResult} from 'src/declarations/hub/hub.did';
import {useEffect, useMemo, useState} from 'react';

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
        <HubContractTemplateProvider hubCanisterId={hubCanisterId} contractTemplateId={contractTemplateId}>
            <Content hubCanisterId={hubCanisterId} contractCanisterId={contractCanisterId} />
        </HubContractTemplateProvider>
    );
};

const Content = ({hubCanisterId, contractCanisterId}: {hubCanisterId: string; contractCanisterId: Principal}) => {
    const {hubContractTemplate} = useHubContractTemplateContext();
    const {getHubAnonymousCanister} = useCanisterContext();
    const [contractBlockStatus, setContractBlockStatus] = useState<GetContractBlockStatusResult | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;

        setContractBlockStatus(undefined);

        void (async () => {
            const actor = await getHubAnonymousCanister(hubCanisterId);
            const call = safeCall(actor.getContractBlockStatus.bind(actor), {logger: apiLogger, logMessagePrefix: 'useHubContractBlockStatus:'});
            const response = await call({
                filter: {
                    ByContractCanisterId: {
                        canister_id: contractCanisterId
                    }
                },
                certified: false
            });

            if (!cancelled && 'Ok' in response) {
                setContractBlockStatus(response.Ok);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [getHubAnonymousCanister, hubCanisterId, contractCanisterId]);

    const isBlocked = useMemo(() => {
        const templateBlocked = nonNullish(hubContractTemplate.data) && nonNullish(fromNullable(hubContractTemplate.data.contract_template.blocked));
        const contractBlocked = nonNullish(contractBlockStatus) && nonNullish(fromNullable(contractBlockStatus.blocked));
        return templateBlocked || contractBlocked;
    }, [hubContractTemplate.data, contractBlockStatus]);

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
