import {isNullish} from '@dfinity/utils';
import {calculateCertificateExpirationStatus} from 'frontend/src/context/certificate/useCertificateExpirationStatus';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {formatDuration} from 'frontend/src/utils/core/date/format';
import {useMemo} from 'react';

export const ExpirationStatus = ({certificateWillExpireAtMillis}: {certificateWillExpireAtMillis: number}) => {
    const status = useMemo(() => {
        return calculateCertificateExpirationStatus(certificateWillExpireAtMillis, false);
    }, [certificateWillExpireAtMillis]);

    if (isNullish(status)) {
        // illegal state - we should not reach here
        return null;
    }

    const statusType = status.type;
    switch (statusType) {
        case 'expired': {
            return <span className="gf-ant-color-error">{i18.status.certificate.expirationDateExpiredWarning}</span>;
        }
        case 'unsellable':
        case 'willExpireSoon':
        case 'valid': {
            const {willExpireInMillis} = status;
            const durationLabel = formatDuration(willExpireInMillis, {showMillis: true});
            const label = isNullish(durationLabel) ? i18.status.certificate.expirationDateLabel.soon : i18.status.certificate.expirationDateLabel.label(durationLabel);
            const colorClass = statusType == 'unsellable' ? 'gf-ant-color-error' : statusType == 'willExpireSoon' ? 'gf-ant-color-warning' : undefined;
            return <span className={colorClass}>{label}</span>;
        }
        default: {
            const exhaustiveCheck: never = statusType;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return null;
        }
    }
};
