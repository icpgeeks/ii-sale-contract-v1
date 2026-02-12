import {AlertActionButton} from 'frontend/src/components/widgets/alert/AlertActionButton';
import {ErrorAlertWithAction} from 'frontend/src/components/widgets/alert/ErrorAlertWithAction';
import {useCurrentCanisterIdContext} from 'frontend/src/context/canisterId/CurrentCanisterIdProvider';
import {i18} from 'frontend/src/i18';

export const CurrentCanisterIdLoadingErrorPanel = () => {
    const {
        fetchCurrentCanisterId,
        feature: {
            status: {inProgress}
        }
    } = useCurrentCanisterIdContext();
    return <ErrorAlertWithAction message={i18.contractCanisterId.stub.error.title} action={<AlertActionButton onClick={fetchCurrentCanisterId} loading={inProgress} />} large />;
};
