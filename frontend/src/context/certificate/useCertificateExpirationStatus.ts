import {isNullish} from '@dfinity/utils';
import {CONTRACT_WILL_EXPIRE_SOON_THRESHOLD_MILLIS, EXPIRATION_OFFSETS, SALE_DEAL_SAFE_CLOSE_DURATION} from 'frontend/src/constants';
import {useDynamicTickForTargetTime} from 'frontend/src/hook/useDynamicTickForTargetTime';
import {getDurationTillUTCMillisUnsafe} from 'frontend/src/utils/core/date/duration';
import {useMemo} from 'react';
import {useContractCertificateContext} from './ContractCertificateProvider';

type Context = {
    tick: number;
    status: CertificateExpirationStatus | undefined;
};
export const useCertificateExpirationStatus = (): Context => {
    const {feature, contractCertificate} = useContractCertificateContext();
    const isError = feature.error.isError;
    const {tick, targetTimeMillis: certificateWillExpireAtMillis} = useDynamicTickForTargetTime(contractCertificate?.expiration, EXPIRATION_OFFSETS);
    return useMemo<Context>(
        () => ({
            tick,
            status: calculateCertificateExpirationStatus(certificateWillExpireAtMillis, isError)
        }),
        [tick, certificateWillExpireAtMillis, isError]
    );
};

export type CertificateExpirationStatus =
    | {type: 'expired'}
    | {type: 'unsellable' | 'valid'; willExpireInMillis: number}
    | {type: 'willExpireSoon'; willExpireInMillis: number; durationTillUnsellableMillis: number};

export const calculateCertificateExpirationStatus = (certificateWillExpireAtMillis: number | undefined, isError: boolean): CertificateExpirationStatus | undefined => {
    if (isError || isNullish(certificateWillExpireAtMillis)) {
        return undefined;
    }

    const willExpireInMillis = certificateWillExpireAtMillis - Date.now();
    if (willExpireInMillis <= 0) {
        return {type: 'expired'};
    }

    const isUnsellable = certificateWillExpireAtMillis - SALE_DEAL_SAFE_CLOSE_DURATION < Date.now();
    if (isUnsellable) {
        return {type: 'unsellable', willExpireInMillis};
    }

    const durationTillUnsellableMillis = getDurationTillUTCMillisUnsafe(certificateWillExpireAtMillis - SALE_DEAL_SAFE_CLOSE_DURATION);
    if (durationTillUnsellableMillis < CONTRACT_WILL_EXPIRE_SOON_THRESHOLD_MILLIS) {
        return {type: 'willExpireSoon', durationTillUnsellableMillis, willExpireInMillis};
    }
    return {type: 'valid', willExpireInMillis};
};
