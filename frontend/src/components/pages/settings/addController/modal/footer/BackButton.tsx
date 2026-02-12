import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useAddControllerModalDataContext} from '../AddControllerModalDataProvider';

export const BackButton = () => {
    const {cancelButtonProps} = useAddControllerModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
