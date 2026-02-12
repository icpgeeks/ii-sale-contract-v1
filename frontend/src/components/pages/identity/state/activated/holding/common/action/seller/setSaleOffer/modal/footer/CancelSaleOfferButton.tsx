import {LinkButton} from 'frontend/src/components/widgets/button/LinkButton';
import {useSetSaleOfferModalDataContext} from '../SetSaleOfferModalDataProvider';

export const CancelSaleOfferButton = () => {
    const {cancelSaleOfferButtonVisible, cancelSaleOfferButtonProps} = useSetSaleOfferModalDataContext();

    if (!cancelSaleOfferButtonVisible) {
        return null;
    }
    return (
        <div className="gf-ta-center">
            <LinkButton {...cancelSaleOfferButtonProps} />
        </div>
    );
};
