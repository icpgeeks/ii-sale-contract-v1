import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useAcceptOfferModalDataContext} from '../AcceptOfferModalDataProvider';

export const CancelButton = () => {
    const {cancelButtonProps} = useAcceptOfferModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
