import {ReloadIconButton} from 'frontend/src/components/widgets/button/ReloadIconButton';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';

export const RefreshHolderButton = () => {
    const {fetchHolder, feature} = useIdentityHolderContext();
    const {inProgress} = feature.status;
    return <ReloadIconButton onClick={() => fetchHolder()} disabled={inProgress} loading={inProgress} />;
};
