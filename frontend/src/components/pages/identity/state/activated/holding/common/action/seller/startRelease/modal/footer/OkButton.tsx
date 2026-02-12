import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useStartReleaseModalDataContext} from '../StartReleaseModalDataProvider';

export const OkButton = () => {
    const {okButtonProps} = useStartReleaseModalDataContext();
    return <ModalButton {...okButtonProps} type="primary" />;
};
