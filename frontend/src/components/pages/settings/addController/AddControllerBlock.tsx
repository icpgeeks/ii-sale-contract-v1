import {isNullish} from '@dfinity/utils';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {i18} from 'frontend/src/i18';
import {AddControllerModalRenderer, sendOpenAddControllerModalNotification} from './modal/AddControllerModalRenderer';

export const AddControllerBlock = () => {
    const {holder} = useIdentityHolderContext();
    if (isNullish(holder)) {
        return null;
    }
    return (
        <>
            <ActionButton />
            <AddControllerModalRenderer />
        </>
    );
};

const ActionButton = () => {
    return (
        <DefaultButton danger block onClick={sendOpenAddControllerModalNotification}>
            {i18.settings.danger.addController.button}
        </DefaultButton>
    );
};
