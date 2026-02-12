import {AlertActionButton} from 'frontend/src/components/widgets/alert/AlertActionButton';
import {ErrorAlertWithAction} from 'frontend/src/components/widgets/alert/ErrorAlertWithAction';
import {ErrorMessageText} from 'frontend/src/components/widgets/alert/ErrorMessageText';
import {i18} from 'frontend/src/i18';
import {useBuyNowModalDataContext} from '../BuyNowModalDataProvider';

export const BuyNowNotAvailableErrorPanel = () => {
    const {
        requireData: {requireDataAvailability, refetchICRCMetadataInProgress, refetchICRCMetadata}
    } = useBuyNowModalDataContext();

    if (requireDataAvailability.type != 'notAvailable') {
        return null;
    }

    const messageText = i18.common.error.metadataError;
    const message = <ErrorMessageText message={messageText} />;
    const disabled = refetchICRCMetadataInProgress;
    return <ErrorAlertWithAction message={message} action={<AlertActionButton onClick={refetchICRCMetadata} loading={disabled} label={i18.common.button.retryButton} />} />;
};
