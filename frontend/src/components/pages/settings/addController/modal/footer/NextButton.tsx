import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useAddControllerModalDataContext} from '../AddControllerModalDataProvider';

export const NextButton = () => {
    const {okButtonVisible, okButtonProps} = useAddControllerModalDataContext();
    if (!okButtonVisible) {
        return null;
    }
    return <ModalButton {...okButtonProps} type="primary" />;
};
