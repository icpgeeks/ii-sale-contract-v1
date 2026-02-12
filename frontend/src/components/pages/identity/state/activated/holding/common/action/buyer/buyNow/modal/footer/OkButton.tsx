import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useBuyNowModalDataContext} from '../BuyNowModalDataProvider';

export const OkButton = () => {
    const {okButtonProps} = useBuyNowModalDataContext();
    return <ModalButton {...okButtonProps} type="primary" />;
};
