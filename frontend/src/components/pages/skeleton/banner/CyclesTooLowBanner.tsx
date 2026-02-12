import {isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {useCanisterCyclesState} from 'frontend/src/context/identityHolder/useCanisterCyclesState';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';

export const CyclesTooLowBanner = () => {
    const {dataAvailability} = useCanisterCyclesState();
    const lowCyclesWarning = dataAvailability.type == 'available' ? dataAvailability.lowCyclesWarning : false;

    const content = useMemo(() => {
        if (lowCyclesWarning) {
            return (
                <WarningAlert
                    message={
                        <div>
                            <Flex justify="space-between" gap={8}>
                                <div className="gf-strong">{i18.banner.cyclesTooLow.title}</div>
                                <ExternalLinkToFAQAsQuestionMark fragment="top-up" />
                            </Flex>
                            <div>{i18.banner.cyclesTooLow.description}</div>
                        </div>
                    }
                    large
                />
            );
        }
        return null;
    }, [lowCyclesWarning]);

    if (isNullish(content)) {
        return null;
    }

    return <div className="skBanner">{content}</div>;
};
