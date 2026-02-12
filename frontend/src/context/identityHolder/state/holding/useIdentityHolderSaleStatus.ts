import type {Principal} from '@dfinity/principal';
import {fromNullable, isNullish, nonNullish} from '@dfinity/utils';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import type {AccountVariant} from 'frontend/src/utils/ic/account';
import {ledgerAccountToAccountVariant} from 'frontend/src/utils/ic/ledgerAccount';
import {useMemo} from 'react';
import type {SaleDeal, SaleDealState} from 'src/declarations/contract/contract.did';
import {useIdentityHolderContext} from '../../IdentityHolderProvider';
import {useIdentityHolderStateContext} from '../IdentityHolderStateProvider';

type NoData = {
    type: 'noData';
};

type NoSaleIntention = {
    type: 'saleIntentionNotSet';
};

export type CurrentUserRole = 'owner' | 'buyer' | 'guest';
type DataStatus =
    | {
          type: 'notListed';
      }
    | {
          type: 'listed';
          price: bigint;
      }
    | {
          type: 'sold';
          price: bigint;

          buyer: Principal;
      };

type SaleIntentionSet = DataStatus & {
    receiverAccountVariant: AccountVariant;

    saleWillExpireAtMillis: bigint;
    saleDeal: SaleDeal;
    saleDealState: SaleDealState;
};

type Data = {
    owner: Principal;

    quarantineEndTimeMillis: number | undefined;

    currentUserRole: CurrentUserRole;
} & (NoSaleIntention | SaleIntentionSet);

type Result = NoData | Data;

export const useIdentityHolderSaleStatus = (): Result => {
    const {principal} = useAuthContext();
    const {holder, isOwnedByCurrentUser} = useIdentityHolderContext();
    const {getSubStateValue} = useIdentityHolderStateContext();
    const holdingHoldSubState = useMemo(() => getSubStateValue('Holding', 'Hold'), [getSubStateValue]);

    return useMemo<Result>(() => {
        if (isNullish(holder)) {
            return {type: 'noData'};
        }

        const owner = fromNullable(holder.owner);
        if (isNullish(owner)) {
            return {type: 'noData'};
        }

        if (isNullish(holdingHoldSubState)) {
            return {type: 'noData'};
        }

        const quarantineEndTime = fromNullable(holdingHoldSubState.quarantine);
        const quarantineEndTimeMillis = nonNullish(quarantineEndTime) ? Number(quarantineEndTime) : undefined;

        const currentUserRole: CurrentUserRole = isOwnedByCurrentUser ? 'owner' : 'guest';

        const saleDeal = fromNullable(holder.sale_deal);
        const saleDealState = fromNullable(holdingHoldSubState.sale_deal_state);
        if (isNullish(saleDeal) || isNullish(saleDealState)) {
            return {type: 'saleIntentionNotSet', owner, quarantineEndTimeMillis, currentUserRole};
        }
        const receiverAccountVariant = ledgerAccountToAccountVariant(saleDeal.receiver_account);
        if (isNullish(receiverAccountVariant)) {
            return {type: 'saleIntentionNotSet', owner, quarantineEndTimeMillis, currentUserRole};
        }

        const saleWillExpireAtMillis = saleDeal.expiration_time;

        const price = fromNullable(saleDeal.sale_price)?.value;
        if (isNullish(saleDealState) || isNullish(price) || hasProperty(saleDealState, 'WaitingSellOffer')) {
            return {type: 'notListed', owner, quarantineEndTimeMillis, currentUserRole, receiverAccountVariant, saleWillExpireAtMillis, saleDeal, saleDealState};
        }

        if (hasProperty(saleDealState, 'Accept')) {
            const {buyer} = saleDealState.Accept;
            let currentUserRoleWithBuyer: CurrentUserRole = 'guest';
            if (nonNullish(principal)) {
                if (buyer.compareTo(principal) == 'eq') {
                    currentUserRoleWithBuyer = 'buyer';
                } else if (owner.compareTo(principal) == 'eq') {
                    currentUserRoleWithBuyer = 'owner';
                }
            }

            return {
                type: 'sold',
                owner,
                receiverAccountVariant,
                saleWillExpireAtMillis,
                price,
                buyer,
                currentUserRole: currentUserRoleWithBuyer,
                quarantineEndTimeMillis,
                saleDeal,
                saleDealState
            };
        }

        return {
            type: 'listed',
            owner,
            quarantineEndTimeMillis,
            currentUserRole,
            receiverAccountVariant,
            saleWillExpireAtMillis,
            price,
            saleDeal,
            saleDealState
        };
    }, [holder, holdingHoldSubState, isOwnedByCurrentUser, principal]);
};
