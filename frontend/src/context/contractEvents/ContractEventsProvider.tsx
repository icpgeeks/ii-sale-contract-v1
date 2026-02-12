import type {TablePaginationConfig} from 'antd';
import {PAGE_SIZE} from 'frontend/src/constants';
import type {PropsWithChildren} from 'react';
import {createContext, useCallback, useContext, useMemo} from 'react';
import type {GetHolderEventsResult, IdentifiedHolderProcessingEvent, IdentityEventsSortingKey, SortingOrder} from 'src/declarations/contract/contract.did';
import {useDefaultPaginationConfig} from '../../hook/useDefaultPaginationConfig';
import {
    useRemoteListWithUrlState,
    type ListSortItem,
    type ListState,
    type RemoteDataProvider,
    type RemoteListWithUrlStateOptions,
    type RemoteListWithUrlStateResult
} from '../../hook/useRemoteListWithUrlState';
import {applicationLogger} from '../logger/logger';
import {useContractEvents, type FetchChunkParameters, type FetchChunkParametersSorting} from './useContractEvents';

export type RemoteDataItemType = IdentifiedHolderProcessingEvent;

type Context = RemoteListWithUrlStateResult<RemoteDataItemType> & {
    initialState: ListState;
    pagination: TablePaginationConfig;
};
const Context = createContext<Context | undefined>(undefined);
export const useContractEventsProviderContext = () => {
    const context = useContext(Context);
    if (!context) {
        throw new Error('useContractEventsProviderContext must be used within a ContractEventsProvider');
    }
    return context;
};

type Props = {
    mapTableColumnToContractEventsSortingKey: (columnKey: string) => IdentityEventsSortingKey | undefined;
};

export const ContractEventsProvider = (props: PropsWithChildren<Props>) => {
    const {mapTableColumnToContractEventsSortingKey} = props;

    const defaultPagination = useDefaultPaginationConfig();

    const {fetchChunk: fetchContractEventsChunk} = useContractEvents();

    const remoteDataProvider: RemoteDataProvider<RemoteDataItemType> = useCallback(
        async (listState: ListState) => {
            const {currentPage, pageSize, sort} = listState;
            const start = (currentPage - 1) * pageSize;
            const defaultSorting: FetchChunkParametersSorting = {
                key: {Created: null},
                order: {Descending: null}
            };
            const fetchChunkParameters: FetchChunkParameters = {
                count: pageSize,
                start: start,
                sorting: listParametersSortToRestParameterSorting(sort, mapTableColumnToContractEventsSortingKey) ?? defaultSorting
            };
            const result: GetHolderEventsResult = await fetchContractEventsChunk(fetchChunkParameters);
            return {
                data: result.events,
                total: Number(result.total_count)
            };
        },
        [mapTableColumnToContractEventsSortingKey, fetchContractEventsChunk]
    );

    const initialState: ListState = useMemo(() => {
        return {
            currentPage: 1,
            pageSize: PAGE_SIZE.contractEvents,
            filters: undefined,
            sort: undefined
        };
    }, []);

    const listOptions: RemoteListWithUrlStateOptions = useMemo(() => {
        return {
            initialState,
            queryParametersPrefix: 'contractEvents.'
        };
    }, [initialState]);

    const remoteListWithUrlState = useRemoteListWithUrlState<RemoteDataItemType>(remoteDataProvider, listOptions, applicationLogger, 'ContractEventsProvider');
    const {listState, listTotalSize} = remoteListWithUrlState;

    const pagination: TablePaginationConfig = useMemo(() => {
        return {
            ...defaultPagination,
            current: listState.currentPage,
            pageSize: listState.pageSize,
            total: listTotalSize
        };
    }, [defaultPagination, listState.currentPage, listState.pageSize, listTotalSize]);

    const value: Context = useMemo(
        () => ({
            ...remoteListWithUrlState,
            initialState,
            pagination
        }),
        [remoteListWithUrlState, initialState, pagination]
    );

    return <Context.Provider value={value}>{props.children}</Context.Provider>;
};

const listParametersSortToRestParameterSorting = (sort: ListState['sort'], mapTableColumnToContractsSortingKey: Props['mapTableColumnToContractEventsSortingKey']): FetchChunkParameters['sorting'] => {
    const sortItem: ListSortItem | undefined = sort?.[0];
    if (sortItem == undefined) {
        return undefined;
    }
    const sortingKey: IdentityEventsSortingKey | undefined = mapTableColumnToContractsSortingKey(sortItem.field);
    const sortingOrder: SortingOrder | undefined = sortItem.order == 'ascend' ? {Ascending: null} : sortItem.order == 'descend' ? {Descending: null} : undefined;

    if (sortingKey == undefined || sortingOrder == undefined) {
        return undefined;
    }
    return {
        key: sortingKey,
        order: sortingOrder
    };
};
