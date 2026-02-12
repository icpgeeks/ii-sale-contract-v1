import {isNullish} from '@dfinity/utils';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {CancelSaleIntentionModalFromSettingsRenderer, sendOpenCancelSaleOfferModalFromSettingsNotification} from './CancelSaleIntentionModalFromSettingsRenderer';

export const CancelSaleIntentionBlock = () => {
    const {holder, identityNumber} = useIdentityHolderContext();
    if (isNullish(holder) || isNullish(identityNumber)) {
        return null;
    }
    return (
        <>
            <ActionButton />
            <CancelSaleIntentionModalFromSettingsRenderer />
        </>
    );
};

const ActionButton = () => {
    return (
        <DefaultButton danger block onClick={sendOpenCancelSaleOfferModalFromSettingsNotification}>
            {i18.settings.danger.cancelSaleIntention.button}
        </DefaultButton>
    );
};
