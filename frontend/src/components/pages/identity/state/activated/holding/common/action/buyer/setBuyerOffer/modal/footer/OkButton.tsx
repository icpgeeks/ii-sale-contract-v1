import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useSetBuyerOfferModalDataContext} from '../SetBuyerOfferModalDataProvider';

export const OkButton = () => {
    const {okButtonProps} = useSetBuyerOfferModalDataContext();
    return <ModalButton {...okButtonProps} type="primary" />;
};
