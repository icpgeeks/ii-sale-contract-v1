import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useCancelCaptureIdentityModalDataContext} from '../CancelCaptureIdentityModalDataProvider';

export const CancelButton = () => {
    const {cancelButtonProps} = useCancelCaptureIdentityModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
