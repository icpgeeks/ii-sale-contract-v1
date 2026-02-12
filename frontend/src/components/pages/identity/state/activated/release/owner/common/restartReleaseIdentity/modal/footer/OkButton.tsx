import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useRestartReleaseIdentityModalDataContext} from '../RestartReleaseIdentityModalDataProvider';

export const OkButton = () => {
    const {okButtonProps} = useRestartReleaseIdentityModalDataContext();
    return <ModalButton {...okButtonProps} type="primary" />;
};
