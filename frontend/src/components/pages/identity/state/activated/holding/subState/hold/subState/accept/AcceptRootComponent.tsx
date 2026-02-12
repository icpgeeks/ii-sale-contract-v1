import {AbstractStubPage} from 'frontend/src/components/widgets/stub/AbstractStubPage';
import {i18} from 'frontend/src/i18';

export const AcceptRootComponent = () => {
    return <AbstractStubPage icon="settings" title={i18.holder.state.common.acceptDeal} />;
};
