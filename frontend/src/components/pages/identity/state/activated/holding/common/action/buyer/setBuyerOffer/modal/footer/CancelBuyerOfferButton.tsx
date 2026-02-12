import {ModalButton} from 'frontend/src/components/widgets/button/ModalButton';
import {useSetBuyerOfferModalDataContext} from '../SetBuyerOfferModalDataProvider';

export const CancelBuyerOfferButton = () => {
    const {cancelBuyerOfferButtonVisible, cancelBuyerOfferButtonProps} = useSetBuyerOfferModalDataContext();

    if (!cancelBuyerOfferButtonVisible) {
        return null;
    }
    return (
        <div className="gf-ta-center">
            <ModalButton {...cancelBuyerOfferButtonProps} type="link" />
        </div>
    );
};
