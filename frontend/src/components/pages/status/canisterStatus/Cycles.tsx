import {isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {LoadingAndFailedToLoadValueWrapper} from 'frontend/src/components/widgets/alert/LoadingAndFailedToLoadValueWrapper';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {useCanisterCyclesState} from 'frontend/src/context/identityHolder/useCanisterCyclesState';
import {convertFractionalAdaptiveSI} from 'frontend/src/utils/core/number/si/convert';
import {formatCyclesValueWithUnitByStrategy} from 'frontend/src/utils/ic/cycles/format';
import {useMemo} from 'react';

export const Cycles = () => {
    const {dataAvailability} = useCanisterCyclesState();
    const loading = dataAvailability.type === 'loading';
    const isError = dataAvailability.type === 'notAvailable';

    const [value, colorClass] = useMemo<[string | undefined, string | undefined]>(() => {
        if (dataAvailability.type !== 'available') {
            return [undefined, undefined];
        }
        const lowCyclesWarning = dataAvailability.lowCyclesWarning ?? false;
        const criticalCyclesWarning = dataAvailability.criticalCyclesWarning ?? false;
        const colorClass = criticalCyclesWarning ? 'gf-ant-color-error' : lowCyclesWarning ? 'gf-ant-color-warning' : undefined;
        const cyclesAdaptive = convertFractionalAdaptiveSI(dataAvailability.state.current_cycles, 'T');
        return [formatCyclesValueWithUnitByStrategy(cyclesAdaptive, 'long'), colorClass];
    }, [dataAvailability]);

    if (isNullish(value) || isError) {
        return <LoadingAndFailedToLoadValueWrapper loaded={!loading} isError inProgress={loading} />;
    }
    return (
        <Flex gap={16} align="center">
            <span className={colorClass}>{value}</span>
            <ExternalLinkToFAQAsQuestionMark fragment="top-up" />
        </Flex>
    );
};
