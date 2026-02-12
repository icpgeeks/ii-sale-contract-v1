import {isNullish, nonNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {useCertificateExpirationStatus, type CertificateExpirationStatus} from 'frontend/src/context/certificate/useCertificateExpirationStatus';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {formatDuration} from 'frontend/src/utils/core/date/format';
import {useMemo} from 'react';

export const SaleDealAndCertificateExpiredBanner = () => {
    const {tick, status} = useCertificateExpirationStatus();

    return <BannerWrapper key={tick} status={status} />;
};

const BannerWrapper = (props: {status: CertificateExpirationStatus | undefined}) => {
    const {hasCompletedSaleDeal} = useIdentityHolderContext();
    const {stateUnion} = useIdentityHolderStateContext();
    const shouldHideCertificateBanner = hasCompletedSaleDeal || stateUnion?.type == 'Release' || stateUnion?.type == 'Closed';

    const {status} = props;
    const content = useMemo(() => {
        if (shouldHideCertificateBanner) {
            return null;
        }
        if (isNullish(status)) {
            return null;
        }
        const statusType = status.type;
        switch (statusType) {
            case 'expired': {
                return (
                    <ErrorAlert
                        message={
                            <div>
                                <Flex justify="space-between" gap={8}>
                                    <div className="gf-strong">{i18.banner.expired.title}</div>
                                    <ExternalLinkToFAQAsQuestionMark fragment="contract-certificate" />
                                </Flex>
                                <div>{i18.banner.expired.description}</div>
                            </div>
                        }
                        large
                    />
                );
            }
            case 'unsellable': {
                return (
                    <ErrorAlert
                        message={
                            <div>
                                <Flex justify="space-between" gap={8}>
                                    <div className="gf-strong">{i18.banner.unsellable.title}</div>
                                    <ExternalLinkToFAQAsQuestionMark fragment="contract-certificate" />
                                </Flex>
                                <div>{i18.banner.unsellable.description}</div>
                            </div>
                        }
                        large
                    />
                );
            }
            case 'willExpireSoon': {
                const durationLabel = formatDuration(status.durationTillUnsellableMillis);
                const description = nonNullish(durationLabel) ? i18.banner.willExpireSoon.description(durationLabel) : i18.banner.willExpireSoon.descriptionSoon;
                return (
                    <WarningAlert
                        message={
                            <div>
                                <Flex justify="space-between" gap={8}>
                                    <div className="gf-strong">{i18.banner.willExpireSoon.title}</div>
                                    <ExternalLinkToFAQAsQuestionMark fragment="safety-window" />
                                </Flex>
                                <div>{description}</div>
                            </div>
                        }
                        large
                    />
                );
            }
            case 'valid': {
                return null;
            }
            default: {
                const exhaustiveCheck: never = statusType;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                return null;
            }
        }
    }, [status, shouldHideCertificateBanner]);

    if (isNullish(content)) {
        return null;
    }

    return <div className="skBanner">{content}</div>;
};
