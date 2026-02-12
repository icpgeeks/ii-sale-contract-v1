import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useSetSaleIntentionModalDataContext} from '../SetSaleIntentionModalDataProvider';

export const NextButton = () => {
    const {nextButtonProps} = useSetSaleIntentionModalDataContext();
    return <ModalButton {...nextButtonProps} type="primary" />;
};
