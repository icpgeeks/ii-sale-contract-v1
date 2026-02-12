import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useRestartReleaseIdentityModalDataContext} from '../RestartReleaseIdentityModalDataProvider';

export const CancelButton = () => {
    const {cancelButtonProps} = useRestartReleaseIdentityModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
