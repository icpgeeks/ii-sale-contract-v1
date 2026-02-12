import {DeleteHolderAuthnMethodDataProvider} from '../../common/deleteHolderAuthnMethod/DeleteHolderAuthnMethodDataProvider';
import {DangerousToLoseIdentityPanel} from './DangerousToLoseIdentityPanel';

export const DangerousToLoseIdentityPage = () => {
    return (
        <DeleteHolderAuthnMethodDataProvider>
            <DangerousToLoseIdentityPanel />
        </DeleteHolderAuthnMethodDataProvider>
    );
};
