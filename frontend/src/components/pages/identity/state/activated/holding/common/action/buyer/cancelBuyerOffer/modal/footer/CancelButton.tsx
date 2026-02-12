import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useCancelBuyerOfferModalDataContext} from '../CancelBuyerOfferModalDataProvider';

export const CancelButton = () => {
    const {cancelButtonProps} = useCancelBuyerOfferModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
