import {IdentityHolderWaitingStartCaptureDataProvider} from './IdentityHolderWaitingStartCaptureDataProvider';
import {IdentityHolderWaitingStartCaptureFormDataProvider} from './IdentityHolderWaitingStartCaptureFormDataProvider';
import {IdentityHolderWaitingStartCaptureStatePanel} from './IdentityHolderWaitingStartCaptureStatePanel';

export const IdentityHolderWaitingStartCaptureStatePage = () => {
    return (
        <IdentityHolderWaitingStartCaptureFormDataProvider>
            <IdentityHolderWaitingStartCaptureDataProvider>
                <IdentityHolderWaitingStartCaptureStatePanel />
            </IdentityHolderWaitingStartCaptureDataProvider>
        </IdentityHolderWaitingStartCaptureFormDataProvider>
    );
};
