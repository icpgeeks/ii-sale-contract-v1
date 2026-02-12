import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useDeleteHolderAuthnMethodModalDataContext} from '../DeleteHolderAuthnMethodModalDataProvider';

export const OkButton = () => {
    const {okButtonProps} = useDeleteHolderAuthnMethodModalDataContext();
    return <ModalButton {...okButtonProps} type="primary" />;
};
