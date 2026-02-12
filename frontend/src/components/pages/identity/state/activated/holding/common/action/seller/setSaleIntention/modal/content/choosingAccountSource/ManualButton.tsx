import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {useSetSaleIntentionModalDataContext} from '../../SetSaleIntentionModalDataProvider';

export const ManualButton = () => {
    const {manualButtonProps} = useSetSaleIntentionModalDataContext();
    return <PrimaryButton {...manualButtonProps} />;
};
