import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useSetSaleIntentionModalDataContext} from '../SetSaleIntentionModalDataProvider';

export const BackButton = () => {
    const {backButtonProps} = useSetSaleIntentionModalDataContext();
    return <ModalButton {...backButtonProps} />;
};
