import {ICPToken, isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {LoadingAndFailedToLoadValueWrapper} from 'frontend/src/components/widgets/alert/LoadingAndFailedToLoadValueWrapper';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {KeyValueVertical} from 'frontend/src/components/widgets/KeyValueVertical';
import {i18} from 'frontend/src/i18';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {encodeAccountVariantSafe} from 'frontend/src/utils/ic/account';
import {TransactionList} from '../../../../../common/LatestTransactionsList';
import {Footer} from '../../footer/Footer';
import {useSetSaleIntentionModalDataContext} from '../../SetSaleIntentionModalDataProvider';
import {useSetSaleIntentionModalFormDataContext} from '../../SetSaleIntentionModalFormDataProvider';
import {AgreementCheckbox} from './AgreementCheckbox';

export const ContentStepAccountConfirmation = () => {
    const {actionErrorPanel} = useSetSaleIntentionModalDataContext();
    return (
        <Flex vertical gap={16}>
            <WarningAlert message={i18.holder.state.holding.modal.setSaleIntention.confirm.description} />
            <WalletAddress />
            <KeyValueVertical label={i18.holder.state.holding.modal.setSaleIntention.confirm.balance} value={<Balance />} />
            <KeyValueVertical label={i18.holder.state.holding.modal.setSaleIntention.confirm.latestTransactions.title} value={<LatestTransactions />} gap={4} />
            <AgreementCheckbox />
            {actionErrorPanel}
            <Footer />
        </Flex>
    );
};

const WalletAddress = () => {
    const {formValidationState} = useSetSaleIntentionModalFormDataContext();
    const accountVariant = formValidationState.accountVariant?.type == 'valid' ? formValidationState.accountVariant.accountVariant : undefined;

    return <KeyValueVertical label={i18.holder.state.holding.modal.setSaleIntention.confirm.walletAddress} value={encodeAccountVariantSafe(accountVariant)} />;
};

const Balance = () => {
    const {icpTransactionsResponse, icpTransactionsFeature, fetchTransactionsChunk} = useSetSaleIntentionModalDataContext();
    const {inProgress, loaded} = icpTransactionsFeature.status;

    if (isNullish(icpTransactionsResponse?.balance) || icpTransactionsFeature.error.isError) {
        return <LoadingAndFailedToLoadValueWrapper loaded={loaded} isError inProgress={inProgress} action={fetchTransactionsChunk} showRefreshButton={true} />;
    }
    return formatTokenAmountWithSymbol(icpTransactionsResponse.balance, ICPToken);
};

const LatestTransactions = () => {
    const {icpTransactionsResponse, icpTransactionsFeature, fetchTransactionsChunk} = useSetSaleIntentionModalDataContext();
    const {inProgress, loaded} = icpTransactionsFeature.status;

    const {formValidationState} = useSetSaleIntentionModalFormDataContext();
    const accountVariant = formValidationState.accountVariant?.type == 'valid' ? formValidationState.accountVariant.accountVariant : undefined;

    if (isNullish(icpTransactionsResponse?.transactions) || icpTransactionsFeature.error.isError) {
        return <LoadingAndFailedToLoadValueWrapper loaded={loaded} isError inProgress={inProgress} action={fetchTransactionsChunk} showRefreshButton={true} />;
    }

    return <TransactionList transactions={icpTransactionsResponse?.transactions} accountVariant={accountVariant} />;
};
