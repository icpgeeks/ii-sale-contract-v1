import {Navigate} from 'react-router-dom';
import {PATH_HOME} from '../skeleton/Router';
import {DangerPanel} from './DangerPanel';
import {useSettingsPageAvailable} from './useSettingsPageAvailable';

export const SettingsEntryPoint = () => {
    const areSettingsAvailable = useSettingsPageAvailable();

    if (!areSettingsAvailable) {
        return <Navigate to={PATH_HOME} />;
    }

    return <DangerPanel />;
};
