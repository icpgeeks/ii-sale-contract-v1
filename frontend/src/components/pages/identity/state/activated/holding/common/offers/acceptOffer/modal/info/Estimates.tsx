import {EstimatesComponent} from '../../../../action/common/EstimatesComponent';
import {useAcceptOfferModalDataContext} from '../AcceptOfferModalDataProvider';

export const Estimates = () => {
    const {estimates} = useAcceptOfferModalDataContext();
    return <EstimatesComponent estimates={estimates} />;
};
