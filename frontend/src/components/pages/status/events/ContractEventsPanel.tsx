import {Flex} from 'antd';
import {ReloadIconButton} from 'frontend/src/components/widgets/button/ReloadIconButton';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {ContractEventsProvider, useContractEventsProviderContext} from 'frontend/src/context/contractEvents/ContractEventsProvider';
import {i18} from 'frontend/src/i18';
import type {IdentityEventsSortingKey} from 'src/declarations/contract/contract.did';
import {ContractEventsTable} from './ContractEventsTable';

export const ContractEventsPanel = () => {
    return (
        <ContractEventsProvider mapTableColumnToContractEventsSortingKey={mapTableColumnToContractEventsSortingKey}>
            <Inner />
        </ContractEventsProvider>
    );
};

const Inner = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <Flex justify="space-between">
                    <PanelHeader title={i18.status.contractEvents.panelTitle} />
                    <RefreshButton />
                </Flex>
                <div>{i18.status.contractEvents.panelDescription}</div>
                <ContractEventsTable />
            </Flex>
        </PanelCard>
    );
};

export const TABLE_COLUMN_KEY__CREATED = 'created';

const mapTableColumnToContractEventsSortingKey = (columnKey: string): IdentityEventsSortingKey | undefined => {
    if (columnKey == TABLE_COLUMN_KEY__CREATED) {
        return {Created: null};
    }
    return undefined;
};

const RefreshButton = () => {
    const {feature, fetchRemoteData} = useContractEventsProviderContext();
    if (feature.error.isError) {
        return null;
    }
    const {inProgress, loaded} = feature.status;
    const disabled = inProgress || !loaded;
    return <ReloadIconButton onClick={() => fetchRemoteData()} disabled={disabled} loading={inProgress} />;
};
