import {Flex} from 'antd';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {ReleasePanelHeader} from '../../../common/ReleasePanelHeader';
import {ReleaseStepsRow} from '../../../common/ReleaseStepsRow';
import {AuthnMethodRegistrationModeEnterInvalidRegistrationIdPanelContent} from './authnMethodRegistrationModeEnterInvalidRegistrationId/AuthnMethodRegistrationModeEnterInvalidRegistrationIdPanelContent';
import {ReleaseFailedCommonPanelContent} from './common/ReleaseFailedCommonPanelContent';

export const ReleaseFailedPage = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <ReleasePanelHeader />
                    <ReleaseStepsRow />
                </div>
                <Content />
            </Flex>
        </PanelCard>
    );
};

const Content = () => {
    const {getSubStateValue} = useIdentityHolderStateContext();
    const releaseError = getSubStateValue('Release', 'ReleaseFailed')?.error;
    const stateUnion = getSingleEntryUnion(releaseError);

    if (stateUnion?.type === 'AuthnMethodRegistrationModeEnterInvalidRegistrationId') {
        return <AuthnMethodRegistrationModeEnterInvalidRegistrationIdPanelContent />;
    }
    return <ReleaseFailedCommonPanelContent />;
};
