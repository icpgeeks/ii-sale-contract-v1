import {DeleteHolderAuthnMethodDataProvider} from '../../common/deleteHolderAuthnMethod/DeleteHolderAuthnMethodDataProvider';
import {CheckingAccessFromOwnerAuthnMethodDataProvider} from './CheckingAccessFromOwnerAuthnMethodDataProvider';
import {CheckingAccessFromOwnerAuthnMethodFormDataProvider} from './CheckingAccessFromOwnerAuthnMethodFormDataProvider';
import {CheckingAccessFromOwnerAuthnMethodPanel} from './CheckingAccessFromOwnerAuthnMethodPanel';

export const CheckingAccessFromOwnerAuthnMethodPage = () => {
    return (
        <DeleteHolderAuthnMethodDataProvider>
            <CheckingAccessFromOwnerAuthnMethodFormDataProvider>
                <CheckingAccessFromOwnerAuthnMethodDataProvider>
                    <CheckingAccessFromOwnerAuthnMethodPanel />
                </CheckingAccessFromOwnerAuthnMethodDataProvider>
            </CheckingAccessFromOwnerAuthnMethodFormDataProvider>
        </DeleteHolderAuthnMethodDataProvider>
    );
};
