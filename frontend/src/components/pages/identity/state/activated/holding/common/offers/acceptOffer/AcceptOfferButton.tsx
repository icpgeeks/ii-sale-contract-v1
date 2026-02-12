import type {Principal} from '@dfinity/principal';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderHoldingHoldSubStateSaleDealStateContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderHoldingHoldSubStateSaleDealStateProvider';
import {i18} from 'frontend/src/i18';
import type {MouseEvent} from 'react';
import {useCallback} from 'react';
import {sendOpenAcceptOfferModalNotification} from './AcceptOfferModalRenderer';

export const AcceptOfferButton = ({buyer}: {buyer: Principal}) => {
    const {isOwnedByCurrentUser} = useIdentityHolderContext();
    const {state} = useIdentityHolderHoldingHoldSubStateSaleDealStateContext();
    const isTradingSaleDealState = state?.type == 'Trading';

    const onClick = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            event.preventDefault();
            event.stopPropagation();
            sendOpenAcceptOfferModalNotification({buyer});
            return false;
        },
        [buyer]
    );

    if (!isOwnedByCurrentUser || !isTradingSaleDealState) {
        return null;
    }

    return (
        <>
            <PrimaryButton onClick={onClick}>{i18.holder.state.holding.common.offers.acceptButton}</PrimaryButton>
        </>
    );
};
