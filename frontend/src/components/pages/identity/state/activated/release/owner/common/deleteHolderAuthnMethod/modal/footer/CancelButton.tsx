import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useDeleteHolderAuthnMethodModalDataContext} from '../DeleteHolderAuthnMethodModalDataProvider';

export const CancelButton = () => {
    const {cancelButtonProps} = useDeleteHolderAuthnMethodModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
