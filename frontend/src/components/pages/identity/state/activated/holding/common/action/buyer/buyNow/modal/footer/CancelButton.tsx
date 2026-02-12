import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useBuyNowModalDataContext} from '../BuyNowModalDataProvider';

export const CancelButton = () => {
    const {cancelButtonProps} = useBuyNowModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
