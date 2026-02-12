import type {Operation, Transaction} from '@dfinity/ledger-icp';
import {fromNullable, ICPToken, isNullish} from '@dfinity/utils';
import {nanosToMillis} from '../../core/date/constants';
import {formatTokenAmountWithSymbol} from '../../core/token/token';
import type {KeysOfUnion} from '../../core/typescript/typescriptAddons';
import {hasProperty} from '../../core/typescript/typescriptAddons';
import {getICFirstKey} from '../did';

export const getTransactionAmountIncludingFeeIfOut = (transaction: Transaction, currentAccountIdentifierHex: string): bigint | undefined => {
    if (hasProperty(transaction.operation, 'Approve')) {
        return transaction.operation.Approve.fee.e8s;
    } else if (hasProperty(transaction.operation, 'Burn')) {
        return transaction.operation.Burn.amount.e8s;
    } else if (hasProperty(transaction.operation, 'Mint')) {
        return transaction.operation.Mint.amount.e8s;
    } else if (hasProperty(transaction.operation, 'Transfer')) {
        if (getTransactionDirection(transaction, currentAccountIdentifierHex) == 'in') {
            return transaction.operation.Transfer.amount.e8s;
        }
        return transaction.operation.Transfer.amount.e8s + transaction.operation.Transfer.fee.e8s;
    }
    return undefined;
};

const getTransactionFrom = (transaction: Transaction): string | undefined => {
    if (hasProperty(transaction.operation, 'Approve')) {
        return transaction.operation.Approve.from;
    } else if (hasProperty(transaction.operation, 'Burn')) {
        return transaction.operation.Burn.from;
    } else if (hasProperty(transaction.operation, 'Mint')) {
        return undefined;
    } else if (hasProperty(transaction.operation, 'Transfer')) {
        return transaction.operation.Transfer.from;
    } else {
        return undefined;
    }
};

const getTransactionTo = (transaction: Transaction): string | undefined => {
    if (hasProperty(transaction.operation, 'Approve')) {
        return transaction.operation.Approve.spender;
    } else if (hasProperty(transaction.operation, 'Burn')) {
        return undefined;
    } else if (hasProperty(transaction.operation, 'Mint')) {
        return transaction.operation.Mint.to;
    } else if (hasProperty(transaction.operation, 'Transfer')) {
        return transaction.operation.Transfer.to;
    } else {
        return undefined;
    }
};

export const getTransactionOperation = (transaction: Transaction): KeysOfUnion<Operation> | undefined => {
    return getICFirstKey(transaction.operation);
};

export const getTransactionOperationName = (transaction: Transaction): string | undefined => {
    if (hasProperty(transaction.operation, 'Approve')) {
        const amount = formatTokenAmountWithSymbol(transaction.operation.Approve.allowance.e8s, ICPToken);
        return `Approve ${amount}`;
    } else if (hasProperty(transaction.operation, 'Burn')) {
        return 'Burn';
    } else if (hasProperty(transaction.operation, 'Mint')) {
        return 'Mint';
    } else if (hasProperty(transaction.operation, 'Transfer')) {
        return 'Transfer';
    } else {
        return getICFirstKey(transaction.operation);
    }
};

export const getTransactionDirection = (transaction: Transaction, currentAccountIdentifierHex: string): 'in' | 'out' | undefined => {
    const from = getTransactionFrom(transaction);
    const to = getTransactionTo(transaction);
    if (isNullish(from) || isNullish(to)) {
        return undefined;
    }
    if (from == currentAccountIdentifierHex) {
        return 'out';
    } else if (to == currentAccountIdentifierHex) {
        return 'in';
    } else {
        return undefined;
    }
};

export const getTransactionTimestampMillis = (transaction: Transaction): number | undefined => {
    const timeNanos = (fromNullable(transaction.created_at_time) ?? fromNullable(transaction.timestamp))?.timestamp_nanos;
    if (isNullish(timeNanos)) {
        return undefined;
    }
    return Number(nanosToMillis(timeNanos));
};
