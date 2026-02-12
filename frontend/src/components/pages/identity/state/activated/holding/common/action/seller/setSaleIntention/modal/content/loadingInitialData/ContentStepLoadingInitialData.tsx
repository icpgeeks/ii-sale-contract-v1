import {PanelLoadingComponent} from 'frontend/src/components/widgets/PanelLoadingComponent';
import {i18} from 'frontend/src/i18';

export const ContentStepLoadingInitialData = () => {
    return <PanelLoadingComponent message={i18.common.loading} />;
};
