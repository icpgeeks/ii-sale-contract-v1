import {RestartReleaseIdentityModalRenderer} from './modal/RestartReleaseIdentityModalRenderer';
import {RestartReleaseIdentityButton} from './RestartReleaseIdentityButton';
import {RestartReleaseIdentityDataProvider} from './RestartReleaseIdentityDataProvider';

type Props = {
    externalActionInProgress?: boolean;
};
export const RestartReleaseIdentityButtonContainer = (props: Props) => {
    return (
        <RestartReleaseIdentityDataProvider forceActionDisabled={props.externalActionInProgress}>
            <div className="gf-ta-center">
                <RestartReleaseIdentityButton />
            </div>
            <RestartReleaseIdentityModalRenderer />
        </RestartReleaseIdentityDataProvider>
    );
};
