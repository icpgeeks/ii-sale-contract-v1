import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useAcceptOfferModalDataContext} from '../AcceptOfferModalDataProvider';

export const OkButton = () => {
    const {okButtonProps} = useAcceptOfferModalDataContext();
    return <ModalButton {...okButtonProps} type="primary" />;
};
