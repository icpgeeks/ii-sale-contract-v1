import {AlertActionButton} from 'frontend/src/components/widgets/alert/AlertActionButton';
import {useIdentityHolderContext} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useCallback} from 'react';

export const RetryFetchHolderButton = () => {
    const {feature, fetchHolder} = useIdentityHolderContext();
    const inProgress = feature.status.inProgress;
    const onClick = useCallback(() => fetchHolder(), [fetchHolder]);
    return <AlertActionButton onClick={onClick} loading={inProgress} />;
};
