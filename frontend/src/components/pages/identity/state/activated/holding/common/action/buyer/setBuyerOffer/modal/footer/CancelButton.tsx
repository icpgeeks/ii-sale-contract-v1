import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useSetBuyerOfferModalDataContext} from '../SetBuyerOfferModalDataProvider';

export const CancelButton = () => {
    const {cancelButtonProps} = useSetBuyerOfferModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
