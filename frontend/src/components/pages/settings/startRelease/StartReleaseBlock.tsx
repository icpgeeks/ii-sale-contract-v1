import {isNullish} from '@dfinity/utils';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {sendStartReleaseFromSettingsNotification, StartReleaseModalFromSettingsRenderer} from './StartReleaseModalFromSettingsRenderer';

export const StartReleaseBlock = () => {
    const {holder, identityNumber} = useIdentityHolderContext();
    if (isNullish(holder) || isNullish(identityNumber)) {
        return null;
    }
    return (
        <>
            <ActionButton />
            <StartReleaseModalFromSettingsRenderer />
        </>
    );
};

const ActionButton = () => {
    return (
        <PrimaryButton danger onClick={sendStartReleaseFromSettingsNotification}>
            {i18.settings.danger.startRelease.button}
        </PrimaryButton>
    );
};
