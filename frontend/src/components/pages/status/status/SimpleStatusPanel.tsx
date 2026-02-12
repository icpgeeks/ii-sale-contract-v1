import {Flex} from 'antd';
import {ReloadIconButton} from 'frontend/src/components/widgets/button/ReloadIconButton';
import {KeyValueVertical} from 'frontend/src/components/widgets/KeyValueVertical';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {useCanisterStatusContext} from 'frontend/src/context/ic/canisterStatus/CanisterStatusProvider';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {useCallback, useEffect} from 'react';
import {CanisterId} from '../canisterStatus/CanisterId';
import {CanisterMetadataStatusContent} from '../canisterStatus/CanisterStatusPanel';
import {Cycles} from '../canisterStatus/Cycles';
import {CertificateExpirationDate} from '../certificate/CertificateExpirationDate';

export const SimpleStatusPanel = () => {
    const {fetchHolder, feature: identityHolderFeature} = useIdentityHolderContext();
    const {fetchContractCertificate, feature: contractCertificateFeature} = useContractCertificateContext();

    const {canisterStatus, canisterMetadataStatus} = useCanisterStatusContext();
    const {fetchCanisterStatus, feature: canisterStatusFeature} = canisterStatus;
    const {fetchCanisterMetadataStatus, feature: canisterMetadataStatusFeature} = canisterMetadataStatus;

    const inProgress =
        contractCertificateFeature.status.inProgress || canisterStatusFeature.status.inProgress || canisterMetadataStatusFeature.status.inProgress || identityHolderFeature.status.inProgress;
    const loaded = contractCertificateFeature.status.loaded && canisterStatusFeature.status.loaded && canisterMetadataStatusFeature.status.loaded && identityHolderFeature.status.loaded;

    const fetchAll = useCallback(async () => {
        fetchHolder();
        fetchCanisterStatus();
        fetchContractCertificate();
        fetchCanisterMetadataStatus();
    }, [fetchHolder, fetchCanisterStatus, fetchContractCertificate, fetchCanisterMetadataStatus]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const panelHeader = (
        <Flex justify="space-between">
            <PanelHeader title={i18.status.simple.panelTitle} />
            <RefreshButton inProgress={inProgress} loaded={loaded} onClick={fetchAll} />
        </Flex>
    );

    return (
        <PanelCard>
            <Flex vertical gap={16}>
                {panelHeader}
                <CertificateSection />
                <CanisterStatusSection />
                <CanisterMetadataStatusContent />
            </Flex>
        </PanelCard>
    );
};

const CertificateSection = () => {
    return <KeyValueVertical label={i18.status.certificate.expirationDate} value={<CertificateExpirationDate />} />;
};

const CanisterStatusSection = () => {
    return (
        <Flex vertical gap={16}>
            <KeyValueVertical label={i18.status.certificate.contractCanisterId} value={<CanisterId />} />
            <KeyValueVertical label={i18.status.canisterStatus.cycles} value={<Cycles />} />
        </Flex>
    );
};

const RefreshButton = (props: {inProgress: boolean; loaded: boolean; onClick: () => Promise<void>}) => {
    const {inProgress, loaded, onClick} = props;
    const disabled = inProgress || !loaded;
    return <ReloadIconButton onClick={onClick} loading={inProgress} disabled={disabled} />;
};
