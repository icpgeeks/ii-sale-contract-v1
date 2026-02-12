import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useCancelCaptureIdentityModalDataContext} from '../CancelCaptureIdentityModalDataProvider';

export const OkButton = () => {
    const {okButtonProps} = useCancelCaptureIdentityModalDataContext();
    return <ModalButton {...okButtonProps} type="primary" />;
};
