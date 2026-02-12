import type {TransactionWithId} from '@dfinity/ledger-icp';
import {ICPToken, isNullish} from '@dfinity/utils';
import {Flex, Typography} from 'antd';
import {i18} from 'frontend/src/i18';
import {isEmptyArray} from 'frontend/src/utils/core/array/array';
import {formatDateAgo} from 'frontend/src/utils/core/date/format';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {accountVariantToHex, type AccountVariant} from 'frontend/src/utils/ic/account';
import {
    getTransactionAmountIncludingFeeIfOut,
    getTransactionDirection,
    getTransactionOperation,
    getTransactionOperationName,
    getTransactionTimestampMillis
} from 'frontend/src/utils/ic/icp/icpLedgerUtils';

type Props = {
    transactions: Array<TransactionWithId> | undefined;
    accountVariant?: AccountVariant;
};
export const TransactionList = ({transactions, accountVariant}: Props) => {
    if (isEmptyArray(transactions)) {
        return <div>{i18.holder.state.holding.modal.setSaleIntention.confirm.latestTransactions.stub.empty}</div>;
    }
    return (
        <Flex vertical gap={8}>
            {transactions.map((transaction) => (
                <TransactionListItem key={transaction.id} transaction={transaction} accountVariant={accountVariant} />
            ))}
        </Flex>
    );
};

const TransactionListItem = ({transaction, accountVariant}: {transaction: TransactionWithId; accountVariant?: AccountVariant}) => {
    const currentAccountIdentifierHex = accountVariantToHex(accountVariant) ?? '';

    const transactionOperation = getTransactionOperation(transaction.transaction);
    const transactionOperationLabel = transactionOperation == 'Transfer' ? null : <Typography.Text code>{getTransactionOperationName(transaction.transaction) ?? '-'}</Typography.Text>;
    const transactionDirection = getTransactionDirection(transaction.transaction, currentAccountIdentifierHex);
    const amountClassName = transactionDirection == 'in' ? 'gf-ant-color-success' : 'gf-ant-color-error';
    const amountPrefix = transactionDirection == 'in' ? '+' : '-';

    const transactionAmount = getTransactionAmountIncludingFeeIfOut(transaction.transaction, currentAccountIdentifierHex);
    const transactionLabel = isNullish(transactionAmount) ? '-' : `${amountPrefix}${formatTokenAmountWithSymbol(transactionAmount, ICPToken, {maxDecimalPlaces: 6})}`;

    const timestampMillis = getTransactionTimestampMillis(transaction.transaction);
    const dateAgoLabel = isNullish(timestampMillis) ? '-' : formatDateAgo(timestampMillis);
    return (
        <Flex style={{columnGap: 16, rowGap: 0}} align="center" wrap>
            <div className={amountClassName}>{transactionLabel}</div>
            <div className="gf-ant-color-secondary gf-font-size-smaller">{dateAgoLabel}</div>
            {transactionOperationLabel}
        </Flex>
    );
};
