import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useStartReleaseModalDataContext} from '../StartReleaseModalDataProvider';

export const CancelButton = () => {
    const {cancelButtonProps} = useStartReleaseModalDataContext();
    return <ModalButton {...cancelButtonProps} />;
};
