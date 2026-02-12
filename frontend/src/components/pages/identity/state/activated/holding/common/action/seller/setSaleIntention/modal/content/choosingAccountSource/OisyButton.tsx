import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {useSetSaleIntentionModalDataContext} from '../../SetSaleIntentionModalDataProvider';

export const OisyButton = () => {
    const {oisyButtonProps} = useSetSaleIntentionModalDataContext();
    return <PrimaryButton {...oisyButtonProps} />;
};
