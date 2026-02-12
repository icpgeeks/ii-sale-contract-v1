import {Flex, Grid} from 'antd';
import {useCertificateExpirationStatus} from 'frontend/src/context/certificate/useCertificateExpirationStatus';
import {SellButton} from '../../../../../common/action/seller/sell/SellButton';
import {StartReleaseButton} from '../../../../../common/action/seller/startRelease/StartReleaseButton';
import {SetSaleIntentionButton} from '../address/SetSaleIntentionButton';

const {useBreakpoint} = Grid;

export const ActionRowOwner = () => {
    const breakpoint = useBreakpoint();
    return (
        <Flex gap={16} vertical>
            <SellButton />
            <Flex gap={16} vertical={breakpoint.xs}>
                <SetSaleIntentionButton />
                <SecondaryAction />
            </Flex>
        </Flex>
    );
};

const SecondaryAction = () => {
    const {status: certificateExpirationStatus} = useCertificateExpirationStatus();
    const certificateExpirationStatusType = certificateExpirationStatus?.type;
    const startReleaseButtonType: 'primary' | 'default' = certificateExpirationStatusType == 'unsellable' || certificateExpirationStatusType == 'expired' ? 'primary' : 'default';
    return <StartReleaseButton type={startReleaseButtonType} />;
};
