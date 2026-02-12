import {Flex} from 'antd';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {LoggerEventsProvider} from 'frontend/src/context/logger/LoggerEventsProvider';
import {i18} from 'frontend/src/i18';
import {useEffect} from 'react';
import {CanisterStatusPanel} from '../canisterStatus/CanisterStatusPanel';
import {CertificatePanel} from '../certificate/CertificatePanel';
import {ContractEventsPanel} from '../events/ContractEventsPanel';
import {LoggerEventsPanel} from '../loggerEvents/LoggerEventsPanel';
import {ProcessingErrorPanel} from '../processingError/ProcessingErrorPanel';

export const AdvancedStatusPanel = () => {
    const {fetchHolder} = useIdentityHolderContext();

    useEffect(() => {
        fetchHolder();
    }, [fetchHolder]);

    return (
        <Flex vertical gap={32}>
            <ProcessingErrorPanel />

            <ContractEventsPanel />

            <CertificatePanel />

            <CanisterStatusPanel panelTitle={i18.status.canisterStatus.panelTitle} />

            <LoggerEventsProvider>
                <LoggerEventsPanel />
            </LoggerEventsProvider>
        </Flex>
    );
};
