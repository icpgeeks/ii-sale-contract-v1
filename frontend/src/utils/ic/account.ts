import {AccountIdentifier, isIcpAccountIdentifier, SubAccount, type Account} from '@dfinity/ledger-icp';
import type {AccountIdentifierParam} from '@dfinity/ledger-icp/dist/types/ledger.params';
import type {IcrcAccount} from '@dfinity/ledger-icrc';
import {decodeIcrcAccount, encodeIcrcAccount} from '@dfinity/ledger-icrc';
import type {Subaccount} from '@dfinity/ledger-icrc/dist/candid/icrc_ledger';
import {accountIdentifierFromBytes, principalToAccountIdentifier} from '@dfinity/nns';
import type {Principal} from '@dfinity/principal';
import {base64ToUint8Array, fromNullable, isNullish, nonNullish, toNullable} from '@dfinity/utils';
import {arrayToUint8Array} from '../core/array/array';
import {hasProperty} from '../core/typescript/typescriptAddons';
import {getPrincipalIfValid} from './principal';

export type AccountVariant = {accountIdentifierHex: string} | {icrcAccount: IcrcAccount};

export const decodeAccountVariantSafe = (encodedValue: string | undefined, options: {tryToParseLegacyICPHex?: boolean; allowAnonymousOwner?: boolean} = {}): AccountVariant | undefined => {
    const {tryToParseLegacyICPHex = true, allowAnonymousOwner = false} = options;
    if (isNullish(encodedValue)) {
        return undefined;
    }
    if (tryToParseLegacyICPHex && isIcpAccountIdentifier(encodedValue)) {
        return {accountIdentifierHex: encodedValue};
    }
    const icrcAccount = decodeIcrcAccountSafe(encodedValue);
    if (icrcAccount == undefined) {
        return undefined;
    }
    if (!allowAnonymousOwner && icrcAccount.owner.isAnonymous()) {
        return undefined;
    }
    return {icrcAccount: icrcAccount};
};

export const encodeAccountVariantSafe = (accountVariant: AccountVariant | undefined): string | undefined => {
    if (isNullish(accountVariant)) {
        return undefined;
    }
    if ('accountIdentifierHex' in accountVariant) {
        return accountVariant.accountIdentifierHex;
    } else if ('icrcAccount' in accountVariant) {
        return encodeIcrcAccountSafe(accountVariant.icrcAccount);
    }
    return undefined;
};

export const accountVariantToHex = (accountVariant: AccountVariant | undefined): string | undefined => {
    if (isNullish(accountVariant)) {
        return undefined;
    }
    if (hasProperty(accountVariant, 'accountIdentifierHex')) {
        return accountVariant.accountIdentifierHex;
    } else if (hasProperty(accountVariant, 'icrcAccount')) {
        return icrcAccountToHex(accountVariant.icrcAccount);
    }
};

export const icrcAccountToAccount = (icrcAccount: IcrcAccount): Account => {
    return {
        owner: icrcAccount.owner,
        subaccount: toNullable(icrcAccount.subaccount)
    };
};

export const icrcAccountToHex = (icrcAccount: IcrcAccount | undefined): string | undefined => {
    if (isNullish(icrcAccount)) {
        return undefined;
    }
    const subAccount: Uint8Array | undefined = nonNullish(icrcAccount.subaccount) ? arrayToUint8Array(icrcAccount.subaccount) : undefined;
    return principalToAccountIdentifier(icrcAccount.owner, subAccount);
};

export const accountToIcrcAccount = (account: Account): IcrcAccount => {
    return {
        owner: account.owner,
        subaccount: fromNullable(account.subaccount)
    };
};

export const icrc27AccountToIcrcAccountSafe = (account: {owner: string; subaccount?: string | undefined}): IcrcAccount | undefined => {
    try {
        const subAccountUint8Array: Subaccount | undefined = nonNullish(account.subaccount) ? base64ToUint8Array(account.subaccount) : undefined;
        const owner = getPrincipalIfValid(account.owner);
        if (nonNullish(owner)) {
            return {
                owner,
                subaccount: subAccountUint8Array
            };
        }
    } catch {}
};

const decodeIcrcAccountSafe = (accountString: string | undefined): IcrcAccount | undefined => {
    try {
        if (accountString == undefined) {
            return undefined;
        }
        return decodeIcrcAccount(accountString);
    } catch {}
};

export const encodeIcrcAccountSafe = (icrcAccount: IcrcAccount | undefined): string | undefined => {
    try {
        if (icrcAccount == undefined) {
            return undefined;
        }
        return encodeIcrcAccount(icrcAccount);
    } catch {}
};

/**
==========================================
Account Identifier
==========================================
*/

export const getAccountIdentifierHexFromByteArraySafe = (bytes: Uint8Array | Array<number>): string | undefined => {
    try {
        const result = accountIdentifierFromBytes(arrayToUint8Array(bytes));
        if (isIcpAccountIdentifier(result)) {
            return result;
        }
    } catch {}
};

export const accountIdentifierToAccountVariantSafe = (accountIdentifier: AccountIdentifierParam | undefined): AccountVariant | undefined => {
    if (isNullish(accountIdentifier)) {
        return undefined;
    }
    try {
        if (typeof accountIdentifier === 'string') {
            return {accountIdentifierHex: accountIdentifier};
        }
        return {accountIdentifierHex: accountIdentifier.toHex()};
    } catch {
        return undefined;
    }
};

export const accountVariantToAccountIdentifierParamSafe = (accountVariant: AccountVariant | undefined): AccountIdentifierParam | undefined => {
    if (isNullish(accountVariant)) {
        return undefined;
    }
    try {
        if (hasProperty(accountVariant, 'accountIdentifierHex')) {
            return accountVariant.accountIdentifierHex;
        } else if (hasProperty(accountVariant, 'icrcAccount')) {
            const principal: Principal = accountVariant.icrcAccount.owner;
            if (nonNullish(accountVariant.icrcAccount.subaccount)) {
                const subAccountBytes = arrayToUint8Array(accountVariant.icrcAccount.subaccount);
                const subAccount: SubAccount | Error = SubAccount.fromBytes(subAccountBytes);
                if (subAccount instanceof SubAccount) {
                    return AccountIdentifier.fromPrincipal({
                        principal,
                        subAccount
                    });
                }
            }
            return AccountIdentifier.fromPrincipal({principal});
        }
    } catch {}
    return undefined;
};
