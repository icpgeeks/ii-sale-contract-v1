import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {useOwnerCanCancelSaleIntention} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanCancelSaleIntention';
import {useOwnerCanStartRelease} from 'frontend/src/context/identityHolder/state/holding/useOwnerCanStartRelease';
import {i18} from 'frontend/src/i18';
import {sendStartReleaseNotification, StartReleaseModalRenderer} from './StartReleaseModalRenderer';

export const StartReleaseButton = ({type}: {type: 'primary' | 'default'}) => {
    const ownerCanStartRelease = useOwnerCanStartRelease();
    const ownerCanCancelSaleIntention = useOwnerCanCancelSaleIntention();

    const label = i18.holder.state.holding.common.topPanel.action.owner.transferToMyDevice;

    if (!ownerCanStartRelease && !ownerCanCancelSaleIntention) {
        return null;
    }

    const Component = type == 'primary' ? PrimaryButton : DefaultButton;

    return (
        <>
            <Component onClick={sendStartReleaseNotification} block className="gf-multiline-button">
                {label}
            </Component>
            <StartReleaseModalRenderer />
        </>
    );
};
