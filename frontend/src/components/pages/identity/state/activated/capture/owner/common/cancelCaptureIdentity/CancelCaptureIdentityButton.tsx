import {LinkButton} from 'frontend/src/components/widgets/button/LinkButton';
import {useCancelCaptureIdentityDataContext} from './CancelCaptureIdentityDataProvider';

export const CancelCaptureIdentityButton = () => {
    const {buttonProps, buttonVisible} = useCancelCaptureIdentityDataContext();
    if (!buttonVisible) {
        return null;
    }
    return (
        <div className="gf-ta-center">
            <LinkButton {...buttonProps} />
        </div>
    );
};
