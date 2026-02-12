import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useSetSaleOfferModalDataContext} from '../SetSaleOfferModalDataProvider';

export const OkButton = () => {
    const {okButtonProps} = useSetSaleOfferModalDataContext();
    return <ModalButton {...okButtonProps} type="primary" />;
};
