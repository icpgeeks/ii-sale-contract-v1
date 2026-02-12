import {DeleteHolderAuthnMethodDataProvider} from '../../common/deleteHolderAuthnMethod/DeleteHolderAuthnMethodDataProvider';
import {IdentityAPIChangedDataProvider} from './IdentityAPIChangedDataProvider';
import {IdentityAPIChangedPanel} from './IdentityAPIChangedPanel';

export const IdentityAPIChangedPage = () => {
    return (
        <DeleteHolderAuthnMethodDataProvider>
            <IdentityAPIChangedDataProvider>
                <IdentityAPIChangedPanel />
            </IdentityAPIChangedDataProvider>
        </DeleteHolderAuthnMethodDataProvider>
    );
};
