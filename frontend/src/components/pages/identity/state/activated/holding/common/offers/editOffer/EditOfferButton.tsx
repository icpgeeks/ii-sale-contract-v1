import type {Principal} from '@dfinity/principal';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useIdentityHolderHoldingHoldSubStateSaleDealStateContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderHoldingHoldSubStateSaleDealStateProvider';
import {i18} from 'frontend/src/i18';
import {useCallback, useMemo} from 'react';
import {sendOpenSetOfferModalNotification} from '../../action/buyer/common/MakeOfferButton';

export const EditOfferButton = ({buyer}: {buyer: Principal}) => {
    const {isCurrentLoggedInPrincipal} = useAuthContext();
    const isCurrentBuyer = useMemo(() => {
        return isCurrentLoggedInPrincipal(buyer);
    }, [isCurrentLoggedInPrincipal, buyer]);

    const {state} = useIdentityHolderHoldingHoldSubStateSaleDealStateContext();
    const isTradingSaleDealState = state?.type == 'Trading';

    const openModal = useCallback(() => sendOpenSetOfferModalNotification(), []);

    if (!isCurrentBuyer || !isTradingSaleDealState) {
        return null;
    }
    return <DefaultButton onClick={openModal}>{i18.holder.state.holding.common.topPanel.action.guest.editOffer}</DefaultButton>;
};
