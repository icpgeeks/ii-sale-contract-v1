import {useICCanisterCallContractAnonymous} from 'frontend/src/api/contract/useICCallContract';
import {toError} from 'frontend/src/utils/core/error/toError';
import {type Feature} from 'frontend/src/utils/core/feature/feature';
import {reusePromiseWrapper} from 'frontend/src/utils/core/promise/reusePromise';
import {getICFirstKey} from 'frontend/src/utils/ic/did';
import {useMemo} from 'react';
import type {ContractCertificate} from 'src/declarations/contract/contract.did';
import {apiLogger} from '../logger/logger';

type Context = {
    contractCertificate: ContractCertificate | undefined;
    feature: Feature;
    fetchContractCertificate: () => Promise<void>;
};
export const useContractCertificate = (): Context => {
    const {call, data, feature} = useICCanisterCallContractAnonymous('getContractCertificate');

    const fetchContractCertificate = useMemo(
        () =>
            reusePromiseWrapper(async () => {
                const logMessagePrefix = `useContractCertificate:`;
                await call([], {
                    logger: apiLogger,
                    logMessagePrefix,
                    onResponseErrorBeforeExit: async (responseError) => {
                        throw toError(getICFirstKey(responseError));
                    }
                });
            }),
        [call]
    );

    return useMemo(
        () => ({
            contractCertificate: data?.certificate.contract_certificate,
            feature,
            fetchContractCertificate
        }),
        [data, feature, fetchContractCertificate]
    );
};
