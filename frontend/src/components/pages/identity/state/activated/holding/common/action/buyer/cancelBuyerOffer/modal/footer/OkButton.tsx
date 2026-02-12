import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useCancelBuyerOfferModalDataContext} from '../CancelBuyerOfferModalDataProvider';

export const OkButton = () => {
    const {okButtonProps} = useCancelBuyerOfferModalDataContext();
    return <ModalButton {...okButtonProps} type="primary" />;
};
