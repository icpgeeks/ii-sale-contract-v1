import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useCancelSaleIntentionModalDataContext} from '../CancelSaleIntentionModalDataProvider';

export const OkButton = () => {
    const {okButtonProps} = useCancelSaleIntentionModalDataContext();
    return <ModalButton {...okButtonProps} type="primary" />;
};
