import type {ContractAnonymousCanister} from 'frontend/src/api/contract/ContractCanister';
import {useICCanisterCallContractAnonymous} from 'frontend/src/api/contract/useICCallContract';
import {reusePromiseWrapper} from 'frontend/src/utils/core/promise/reusePromise';
import type {ICHookReturn} from 'frontend/src/utils/ic/api/useICCallTypedFor';
import {useMemo} from 'react';
import {apiLogger} from '../../logger/logger';

type Context = ICHookReturn<ContractAnonymousCanister, 'getCanisterStatus'> & {
    fetchCanisterStatus: () => Promise<void>;
};

export const useCanisterStatus = (): Context => {
    const canisterStatus = useICCanisterCallContractAnonymous('getCanisterStatus');
    const {call} = canisterStatus;

    const fetchCanisterStatus = useMemo(
        () =>
            reusePromiseWrapper(async () => {
                const logMessagePrefix = 'useCanisterStatus:';

                await call([], {
                    logger: apiLogger,
                    logMessagePrefix
                });
            }),
        [call]
    );

    return useMemo(
        () => ({
            ...canisterStatus,
            fetchCanisterStatus
        }),
        [canisterStatus, fetchCanisterStatus]
    );
};
