import {AbstractStubPage} from 'frontend/src/components/widgets/stub/AbstractStubPage';
import {i18} from 'frontend/src/i18';

export const CurrentCanisterIdLoadingPanel = () => {
    return <AbstractStubPage icon="loading" title={i18.contractCanisterId.stub.loading.title} />;
};
