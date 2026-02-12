import {DashboardOutlined, SafetyCertificateOutlined} from '@ant-design/icons';
import {isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {LoadingAndFailedToLoadValueWrapper} from 'frontend/src/components/widgets/alert/LoadingAndFailedToLoadValueWrapper';
import {useCurrentCanisterIdContext} from 'frontend/src/context/canisterId/CurrentCanisterIdProvider';
import {useContractCertificateContext} from 'frontend/src/context/certificate/ContractCertificateProvider';
import {calculateCertificateExpirationStatus} from 'frontend/src/context/certificate/useCertificateExpirationStatus';
import {useCanisterCyclesState} from 'frontend/src/context/identityHolder/useCanisterCyclesState';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {useDynamicTickForTargetTime} from 'frontend/src/hook/useDynamicTickForTargetTime';
import {useWindowSize} from 'frontend/src/hook/useWindowSize';
import {i18} from 'frontend/src/i18';
import {formatDuration} from 'frontend/src/utils/core/date/format';
import {convertFractionalAdaptiveSI} from 'frontend/src/utils/core/number/si/convert';
import {formatCyclesValueWithUnitByStrategy} from 'frontend/src/utils/ic/cycles/format';
import {useMemo} from 'react';
import {Link} from 'react-router-dom';
import {PATH_STATUS} from '../../../Router';

export const ToolbarLeft = () => {
    const {width: screenWidth} = useWindowSize(50);
    const isVertical = screenWidth < 401;
    const gap = isVertical ? 4 : 32;
    const align = isVertical ? undefined : 'center';
    return (
        <Flex gap={gap} className="gf-toolbarCardBodyLeft" align={align} vertical={isVertical}>
            <Link to={PATH_STATUS}>
                <CertificateComponent />
            </Link>
            <Link to={PATH_STATUS}>
                <CyclesComponent />
            </Link>
        </Flex>
    );
};
const CertificateComponent = () => {
    const {feature: currentCanisterIdFeature} = useCurrentCanisterIdContext();
    const currentCanisterIdFeatureError = currentCanisterIdFeature.error.isError;

    const {feature, contractCertificate, fetchContractCertificate} = useContractCertificateContext();
    const inProgress = feature.status.inProgress;
    const loaded = feature.status.loaded || currentCanisterIdFeatureError;
    const isError = feature.error.isError || currentCanisterIdFeatureError;

    const {tick, targetTimeMillis: certificateWillExpireAtMillis} = useDynamicTickForTargetTime(contractCertificate?.expiration);
    const status = useMemo(() => {
        return calculateCertificateExpirationStatus(certificateWillExpireAtMillis, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [certificateWillExpireAtMillis, tick]);

    if (isNullish(certificateWillExpireAtMillis) || isNullish(status) || isError) {
        return (
            <Flex gap={8} align="center">
                <SafetyCertificateOutlined />{' '}
                <LoadingAndFailedToLoadValueWrapper loaded={loaded} isError inProgress={inProgress} action={fetchContractCertificate} failedToLoadLabel={i18.common.error.valueFailedToLoadShort} />
            </Flex>
        );
    }

    return <ExpirationStatus key={tick} status={status} />;
};

const ExpirationStatus = ({status}: {status: NonNullable<ReturnType<typeof calculateCertificateExpirationStatus>>}) => {
    const statusType = status.type;
    switch (statusType) {
        case 'expired': {
            return (
                <Flex gap={8} align="center" className="gf-ant-color-error">
                    <SafetyCertificateOutlined /> <span>{i18.status.certificate.expirationDateExpiredWarning}</span>
                </Flex>
            );
        }
        case 'unsellable':
        case 'willExpireSoon':
        case 'valid': {
            const {willExpireInMillis} = status;
            const durationLabel = formatDuration(willExpireInMillis, {showMillis: true, firstTokenOnly: true});
            const colorClass = statusType == 'unsellable' ? 'gf-ant-color-error' : statusType == 'willExpireSoon' ? 'gf-ant-color-warning' : undefined;
            return (
                <Flex gap={8} align="center" className={colorClass}>
                    <SafetyCertificateOutlined /> <span>{durationLabel}</span>
                </Flex>
            );
        }
        default: {
            const exhaustiveCheck: never = statusType;
            applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            return null;
        }
    }
};

const CyclesComponent = () => {
    const {feature: currentCanisterIdFeature} = useCurrentCanisterIdContext();
    const currentCanisterIdFeatureError = currentCanisterIdFeature.error.isError;

    const {dataAvailability} = useCanisterCyclesState();
    const loading = dataAvailability.type === 'loading' && !currentCanisterIdFeatureError;
    const isError = dataAvailability.type === 'notAvailable' || currentCanisterIdFeatureError;
    const [value, colorClass] = useMemo<[string | undefined, string | undefined]>(() => {
        if (dataAvailability.type !== 'available') {
            return [undefined, undefined];
        }
        const lowCyclesWarning = dataAvailability.lowCyclesWarning ?? false;
        const criticalCyclesWarning = dataAvailability.criticalCyclesWarning ?? false;
        const colorClass = criticalCyclesWarning ? 'gf-ant-color-error' : lowCyclesWarning ? 'gf-ant-color-warning' : undefined;
        const cyclesAdaptive = convertFractionalAdaptiveSI(dataAvailability.state.current_cycles, 'T');
        return [formatCyclesValueWithUnitByStrategy(cyclesAdaptive, 'short'), colorClass];
    }, [dataAvailability]);

    return (
        <Flex gap={8} align="center" className={colorClass}>
            <DashboardOutlined />{' '}
            <LoadingAndFailedToLoadValueWrapper loaded={!loading} isError={isError} inProgress={loading} failedToLoadLabel={i18.common.error.valueFailedToLoadShort}>
                {value}
            </LoadingAndFailedToLoadValueWrapper>
        </Flex>
    );
};
