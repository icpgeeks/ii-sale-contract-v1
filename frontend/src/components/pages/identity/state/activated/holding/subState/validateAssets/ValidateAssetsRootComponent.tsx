import {AbstractStubPage} from 'frontend/src/components/widgets/stub/AbstractStubPage';
import {useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderAssetsProvider';
import {i18} from 'frontend/src/i18';
import {ValidateAssetsPage} from './ValidateAssetsPage';

export const ValidateAssetsRootComponent = () => {
    const {isOwnedByCurrentUser} = useIdentityHolderContextSafe();
    if (isOwnedByCurrentUser) {
        return <ValidateAssetsPage />;
    }
    return <IdentityHolderValidateAssetsStubPanel />;
};

const IdentityHolderValidateAssetsStubPanel = () => {
    const {hasAssets} = useIdentityHolderAssetsContext();
    if (hasAssets) {
        return <AbstractStubPage icon="settings" title={i18.holder.state.common.fetchingAssets.refetching.pageStub} />;
    }
    return <AbstractStubPage icon="settings" title={i18.holder.state.common.fetchingAssets.finalizingTransfer.pageStub} />;
};
