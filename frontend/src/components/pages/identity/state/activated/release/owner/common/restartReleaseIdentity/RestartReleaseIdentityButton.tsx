import {LinkButton} from 'frontend/src/components/widgets/button/LinkButton';
import {useRestartReleaseIdentityDataContext} from './RestartReleaseIdentityDataProvider';

export const RestartReleaseIdentityButton = () => {
    const {buttonProps, buttonVisible} = useRestartReleaseIdentityDataContext();
    if (!buttonVisible) {
        return null;
    }
    return <LinkButton {...buttonProps} />;
};
