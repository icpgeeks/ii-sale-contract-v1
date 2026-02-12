import {isNullish, nonNullish} from '@dfinity/utils';
import {Flex, Table, type TableColumnsType, type TablePaginationConfig, type TableProps} from 'antd';
import {AlertActionButton} from 'frontend/src/components/widgets/alert/AlertActionButton';
import {ErrorAlertWithAction} from 'frontend/src/components/widgets/alert/ErrorAlertWithAction';
import {DateTimeResponsive} from 'frontend/src/components/widgets/DateTimeResponsive';
import {DebugPopupWithData} from 'frontend/src/components/widgets/DebugPopupWithData';
import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {spinLoading} from 'frontend/src/components/widgets/spinUtils';
import {DataEmptyStub} from 'frontend/src/components/widgets/stub/DataEmptyStub';
import {type RemoteDataItemType, useContractEventsProviderContext} from 'frontend/src/context/contractEvents/ContractEventsProvider';
import {type ListState} from 'frontend/src/hook/useRemoteListWithUrlState';
import {i18} from 'frontend/src/i18';
import {compactArray, isEmptyArray} from 'frontend/src/utils/core/array/array';
import {formatDateTime} from 'frontend/src/utils/core/date/format';
import {extractValidPositiveInteger} from 'frontend/src/utils/core/number/transform';
import {getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {getICFirstKey} from 'frontend/src/utils/ic/did';
import {useCallback, useMemo} from 'react';
import {TABLE_COLUMN_KEY__CREATED} from './ContractEventsPanel';

type TableItemType = RemoteDataItemType;

export const ContractEventsTable = () => {
    const {updateListState, feature, remoteData, fetchRemoteData, initialState, pagination} = useContractEventsProviderContext();
    const {inProgress, loaded} = feature.status;
    const {isError} = feature.error;

    const rowKey = useCallback((record: TableItemType) => record.id.toString(), []);

    const columns: TableColumnsType<TableItemType> = useMemo(() => {
        const array: TableColumnsType<TableItemType> = [
            {
                key: 'event',
                title: i18.status.contractEvents.table.event,
                render: (record: TableItemType) => {
                    return <EventColumnComponent record={record} />;
                }
            },
            {
                key: TABLE_COLUMN_KEY__CREATED,
                title: i18.status.contractEvents.table.created,
                render: (record: TableItemType) => <DateTimeResponsive timeMillis={record.time} forceBreakLines />
            },
            {
                key: 'debug',
                render: (record: TableItemType) => {
                    return <DebugPopupWithData title={`Event Time: ${formatDateTime(Number(record.time))}`} data={record} placement="left" />;
                },
                width: '1%'
            }
        ];
        return compactArray(array);
    }, []);

    const handleTableChange: TableProps<TableItemType>['onChange'] = useCallback(
        (pagination: TablePaginationConfig) => {
            const currentPage = extractValidPositiveInteger(`${pagination.current}`) ?? initialState.currentPage;
            const pageSize = extractValidPositiveInteger(`${pagination.pageSize}`) ?? initialState.pageSize;

            const newParams: ListState = {
                currentPage,
                pageSize
            };
            updateListState(newParams);
        },
        [initialState.currentPage, initialState.pageSize, updateListState]
    );

    const componentLoading = useMemo(() => spinLoading(inProgress), [inProgress]);

    if (loaded) {
        if (isError) {
            return <ErrorAlertWithAction message={i18.common.error.unableTo} action={<AlertActionButton onClick={fetchRemoteData} loading={inProgress} label={i18.common.button.retryButton} />} />;
        }
        if (isEmptyArray(remoteData)) {
            return <DataEmptyStub description={i18.status.contractEvents.stub.empty} />;
        }
        return (
            <Table<TableItemType>
                columns={columns}
                rowKey={rowKey}
                dataSource={remoteData}
                pagination={pagination}
                loading={componentLoading}
                onChange={handleTableChange}
                showSorterTooltip={false}
                size="small"
                scroll={{x: 400}}
            />
        );
    } else {
        return <PanelLoadingComponent message={i18.status.contractEvents.stub.loading} />;
    }
};

const EventColumnComponent = ({record}: {record: TableItemType}) => {
    const {event} = record;
    return (
        <Flex vertical>
            <div>{getICFirstKey(event) ?? i18.status.contractEvents.table.stub.unknownEvent}</div>
            <SubEventColumnComponent record={record} />
        </Flex>
    );
};

const SubEventColumnComponent = ({record}: {record: TableItemType}) => {
    const {event} = record;

    const label = useMemo(() => {
        const keys = getEventKeysRecursive(event);
        return keys.length > 1 ? keys.slice(1).join(' / ') : null;
    }, [event]);

    if (isNullish(label)) {
        return null;
    }
    return (
        <div>
            <div className="gf-font-size-small gf-ant-color-secondary">{label}</div>
        </div>
    );
};

function getEventKeysRecursive(event: any): Array<string> {
    const keys: Array<string> = [];
    let current = event;
    while (nonNullish(current) && typeof current === 'object') {
        const union = getSingleEntryUnion(current);
        if (isNullish(union)) {
            break;
        }
        keys.push(String(union.type));
        if (nonNullish(union.state) && typeof union.state === 'object') {
            if ('event' in union.state) {
                current = union.state.event;
            } else if ('fetch_assets_state' in union.state) {
                current = union.state.fetch_assets_state;
            } else if ('sub_state' in union.state) {
                current = union.state.sub_state;
            } else if (union.type == 'ProcessingError' && 'error' in union.state) {
                current = union.state.error;
            } else {
                break;
            }
        } else {
            break;
        }
    }
    return keys;
}
