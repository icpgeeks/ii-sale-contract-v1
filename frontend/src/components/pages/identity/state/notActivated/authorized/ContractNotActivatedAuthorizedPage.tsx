import {ContractNotActivatedAuthorizedDataProvider} from './ContractNotActivatedAuthorizedDataProvider';
import {ContractNotActivatedAuthorizedFormDataProvider} from './ContractNotActivatedAuthorizedFormDataProvider';
import {ContractNotActivatedAuthorizedPanel} from './ContractNotActivatedAuthorizedPanel';

export const ContractNotActivatedAuthorizedPage = () => {
    return (
        <ContractNotActivatedAuthorizedFormDataProvider>
            <ContractNotActivatedAuthorizedDataProvider>
                <ContractNotActivatedAuthorizedPanel />
            </ContractNotActivatedAuthorizedDataProvider>
        </ContractNotActivatedAuthorizedFormDataProvider>
    );
};
