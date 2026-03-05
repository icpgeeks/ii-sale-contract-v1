import {Navigate} from 'react-router-dom';
import {IdentityHolderLoadingPanel} from '../common/stub/IdentityHolderLoadingPanel';
import {PATH_HOME} from '../skeleton/Router';
import {DangerPanel} from './DangerPanel';
import {useSettingsPageAvailable} from './useSettingsPageAvailable';

export const SettingsEntryPoint = () => {
    const settingsAvailability = useSettingsPageAvailable();

    if (settingsAvailability.type === 'loading') {
        return <IdentityHolderLoadingPanel />;
    }

    if (settingsAvailability.type === 'notAvailable' || !settingsAvailability.areSettingsAvailable) {
        return <Navigate to={PATH_HOME} />;
    }

    return <DangerPanel />;
};
