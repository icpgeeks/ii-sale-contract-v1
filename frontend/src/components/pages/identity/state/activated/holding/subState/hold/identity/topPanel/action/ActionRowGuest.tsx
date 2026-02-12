import {Flex, Grid} from 'antd';
import {BuyButton} from '../../../../../common/action/buyer/common/BuyButton';
import {MakeOfferButton} from '../../../../../common/action/buyer/common/MakeOfferButton';
const {useBreakpoint} = Grid;

export const ActionRowGuest = () => {
    const breakpoint = useBreakpoint();
    return (
        <Flex gap={16} vertical={breakpoint.xs}>
            <BuyButton />
            <MakeOfferButton />
        </Flex>
    );
};
