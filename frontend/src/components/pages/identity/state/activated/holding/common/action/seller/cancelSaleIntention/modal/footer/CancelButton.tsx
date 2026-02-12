import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useCancelSaleIntentionModalDataContext} from '../CancelSaleIntentionModalDataProvider';

export const CancelButton = () => {
    const {cancelButtonProps} = useCancelSaleIntentionModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
