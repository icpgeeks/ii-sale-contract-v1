import {ICPToken, isEmptyString} from '@dfinity/utils';
import {formatTokenAmountWithSymbol} from 'frontend/src/utils/core/token/token';
import {EstimatesComponent} from '../../../../common/EstimatesComponent';
import {useSetSaleOfferModalDataContext} from '../SetSaleOfferModalDataProvider';

export const Estimates = () => {
    const {estimates} = useSetSaleOfferModalDataContext();
    return <EstimatesComponent estimates={estimates} />;
};

export const wrapUlpsFormattedValueWithStrong = (ulps: bigint | undefined) => {
    const value = formatTokenAmountWithSymbol(ulps, ICPToken, {fallback: ''});
    if (isEmptyString(value)) {
        return '-';
    }
    return <span className="gf-strong">{value}</span>;
};
