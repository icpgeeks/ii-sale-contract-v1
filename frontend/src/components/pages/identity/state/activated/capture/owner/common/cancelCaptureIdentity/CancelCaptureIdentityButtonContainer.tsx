import {CancelCaptureIdentityButton} from './CancelCaptureIdentityButton';
import {CancelCaptureIdentityDataProvider} from './CancelCaptureIdentityDataProvider';
import {CancelCaptureIdentityModalRenderer} from './modal/CancelCaptureIdentityModalRenderer';

type Props = {
    externalActionInProgress?: boolean;
};
export const CancelCaptureIdentityButtonContainer = (props: Props) => {
    return (
        <CancelCaptureIdentityDataProvider forceActionDisabled={props.externalActionInProgress}>
            <CancelCaptureIdentityButton />
            <CancelCaptureIdentityModalRenderer />
        </CancelCaptureIdentityDataProvider>
    );
};
