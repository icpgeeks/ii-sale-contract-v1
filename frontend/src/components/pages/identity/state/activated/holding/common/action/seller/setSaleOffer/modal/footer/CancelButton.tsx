import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useSetSaleOfferModalDataContext} from '../SetSaleOfferModalDataProvider';

export const CancelButton = () => {
    const {cancelButtonProps} = useSetSaleOfferModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
