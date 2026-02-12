import {ICPToken, isNullish, nonNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {AccountAddressWithWallerIcon} from 'frontend/src/components/widgets/AccountAddressWithWallerIcon';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {i18} from 'frontend/src/i18';
import {formatDuration} from 'frontend/src/utils/core/date/format';
import {calculatePercentageDifferenceUnsafe} from 'frontend/src/utils/core/number/calculation';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {accountVariantToHex} from 'frontend/src/utils/ic/account';
import {ledgerAccountToAccountVariant} from 'frontend/src/utils/ic/ledgerAccount';
import {useMemo} from 'react';
import {getDiscountFromTotalValue} from '../../subState/hold/identity/topPanel/price/ListedPriceDiscountFromTotalValue';
import {AcceptOfferButton} from './acceptOffer/AcceptOfferButton';
import {EditOfferButton} from './editOffer/EditOfferButton';
import type {ItemType} from './OfferList';

type Props = {
    record: ItemType;
};

export const OfferListItem = (props: Props) => {
    const {record} = props;
    return (
        <Flex vertical gap={8} className="gf-width-100">
            <Flex vertical gap={4}>
                <Flex style={{columnGap: 8}} align="center" wrap>
                    <OfferAmount record={record} />
                    <OfferDiscountFromTotalValue record={record} />
                </Flex>
                <Buyer record={record} />
                <Time record={record} />
            </Flex>
            <Buttons record={record} />
        </Flex>
    );
};

const Buttons = (props: {record: ItemType}) => {
    const {record} = props;
    return (
        <>
            <AcceptOfferButton buyer={record.value.buyer} />
            <EditOfferButton buyer={record.value.buyer} />
        </>
    );
};

export const BuyerOfferWithDiscountRow = (props: {record: ItemType}) => {
    const {record} = props;
    return (
        <Flex style={{columnGap: 8}} align="center" wrap>
            <OfferAmount record={record} />
            <OfferDiscountFromTotalValue record={record} />
        </Flex>
    );
};

const OfferAmount = (props: {record: ItemType}) => {
    const {record} = props;
    return <span className="gf-strong">{formatTokenAmountWithSymbol(record.value.offer_amount, ICPToken)}</span>;
};

const OfferDiscountFromTotalValue = (props: {record: ItemType}) => {
    const {record} = props;
    const offerAmount = record.value.offer_amount;
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const linkedAssetsTotalValueUlps = linkedAssets.type == 'assets' ? linkedAssets.totalValueUlps : undefined;

    const discount = useMemo(() => {
        if (isNullish(linkedAssetsTotalValueUlps) || linkedAssetsTotalValueUlps == 0n) {
            return undefined;
        }
        return calculatePercentageDifferenceUnsafe(offerAmount, linkedAssetsTotalValueUlps);
    }, [linkedAssetsTotalValueUlps, offerAmount]);

    return <div className="gf-font-size-smaller">{getDiscountFromTotalValue(discount, {prefix: '', postfix: ''})}</div>;
};

const Buyer = (props: {record: ItemType}) => {
    const {record} = props;
    const account = accountVariantToHex(ledgerAccountToAccountVariant(record.value.approved_account));
    return <AccountAddressWithWallerIcon account={account} className="gf-ant-color-secondary gf-font-size-smaller" />;
};

const Time = (props: {record: ItemType}) => {
    const {record} = props;

    // eslint-disable-next-line react-hooks/purity
    const durationSeconds = (Date.now() - Number(record.timestamp)) / 1000;

    const durationAgoLabel = useMemo(() => {
        const durationLabel = formatDuration(durationSeconds * 1000);
        if (nonNullish(durationLabel)) {
            return i18.holder.state.holding.common.offers.duration.ago(durationLabel);
        }
        return i18.holder.state.holding.common.offers.duration.justNow;
    }, [durationSeconds]);

    return <span className="gf-ant-color-secondary gf-font-size-smaller">{durationAgoLabel}</span>;
};
