import {Flex} from 'antd';
import {ReloadIconButton} from 'frontend/src/components/widgets/button/ReloadIconButton';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {i18} from 'frontend/src/i18';
import {useEffect} from 'react';
import {CertificateDetails} from './CertificateDetails';

export const CertificatePanel = () => {
    const {fetchContractCertificate} = useContractCertificateContext();

    useEffect(() => {
        fetchContractCertificate();
    }, [fetchContractCertificate]);

    const panelHeader = (
        <Flex justify="space-between">
            <PanelHeader title={i18.status.certificate.panelTitle} />
            <RefreshButton />
        </Flex>
    );

    return (
        <PanelCard>
            <Flex vertical gap={16}>
                {panelHeader}
                <CertificateDetails />
            </Flex>
        </PanelCard>
    );
};

const RefreshButton = () => {
    const {feature, fetchContractCertificate} = useContractCertificateContext();
    const {inProgress} = feature.status;
    return <ReloadIconButton onClick={() => fetchContractCertificate()} loading={inProgress} disabled={inProgress} />;
};
