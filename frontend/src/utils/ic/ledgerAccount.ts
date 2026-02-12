import {AccountIdentifier, type Account} from '@dfinity/ledger-icp';
import {fromNullable, isNullish, nonNullish, toNullable} from '@dfinity/utils';
import type {LedgerAccount} from 'src/declarations/contract/contract.did';
import {arrayToUint8Array} from '../core/array/array';
import {hasProperty, type ExtractValueTypeFromUnion} from '../core/typescript/typescriptAddons';
import {accountToIcrcAccount, getAccountIdentifierHexFromByteArraySafe, icrcAccountToAccount, type AccountVariant} from './account';

export const accountVariantToLedgerAccount = (accountVariant: AccountVariant): LedgerAccount => {
    return hasProperty(accountVariant, 'accountIdentifierHex')
        ? {
              AccountIdentifier: {
                  slice: AccountIdentifier.fromHex(accountVariant.accountIdentifierHex).toUint8Array()
              }
          }
        : {
              Account: icrcAccountToAccount(accountVariant.icrcAccount)
          };
};

export const ledgerAccountToAccountVariant = (ledgerAccount: LedgerAccount): AccountVariant | undefined => {
    if (hasProperty(ledgerAccount, 'AccountIdentifier')) {
        const accountIdentifierHex = getAccountIdentifierHexFromByteArraySafe(ledgerAccount.AccountIdentifier.slice);
        if (isNullish(accountIdentifierHex)) {
            return undefined;
        }
        return {accountIdentifierHex};
    } else if (hasProperty(ledgerAccount, 'Account')) {
        return {icrcAccount: accountToIcrcAccount(ledgerAccountAccountToLedgerIcpAccount(ledgerAccount.Account))};
    }
    return undefined;
};

const ledgerAccountAccountToLedgerIcpAccount = (sourceAccount: ExtractValueTypeFromUnion<LedgerAccount, 'Account'>): Account => {
    const sourceSubaccount: Uint8Array | Array<number> | undefined = fromNullable(sourceAccount.subaccount);
    const sourceSubaccountAsUint8Array: Uint8Array | undefined = nonNullish(sourceSubaccount) ? arrayToUint8Array(sourceSubaccount) : undefined;
    const account: Account = {
        owner: sourceAccount.owner,
        subaccount: toNullable(sourceSubaccountAsUint8Array)
    };
    return account;
};
