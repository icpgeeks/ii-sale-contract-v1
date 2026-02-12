import {Flex, Tag} from 'antd';
import {CollapsiblePanel} from 'frontend/src/components/widgets/CollapsiblePanel';
import {PanelHeader} from 'frontend/src/components/widgets/PanelHeader';
import {useIdentityHolderHoldingHoldSubStateSaleDealStateContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderHoldingHoldSubStateSaleDealStateProvider';
import {useIdentityHolderOffersContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderOffersProvider';
import {i18} from 'frontend/src/i18';
import {OfferList} from './OfferList';

export const OfferPanel = () => {
    const {state: saleDealState} = useIdentityHolderHoldingHoldSubStateSaleDealStateContext();
    const isTradingSaleDealState = saleDealState?.type == 'Trading';

    const {numberOfOffers} = useIdentityHolderOffersContext();

    if (!isTradingSaleDealState) {
        return null;
    }

    return (
        <CollapsiblePanel header={<PanelHeader title={<Title />} />} defaultOpened key={numberOfOffers}>
            <OfferList />
        </CollapsiblePanel>
    );
};

const Title = () => {
    const {numberOfOffers} = useIdentityHolderOffersContext();
    if (numberOfOffers == 0) {
        return i18.holder.state.holding.common.offers.title;
    }
    return (
        <Flex align="center" gap={16}>
            <span>{i18.holder.state.holding.common.offers.title}</span>
            <Tag>{numberOfOffers}</Tag>
        </Flex>
    );
};
