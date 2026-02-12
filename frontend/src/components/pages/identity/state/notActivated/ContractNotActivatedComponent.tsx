import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {ContractNotActivatedAnonymousPage} from './anonymous/ContractNotActivatedAnonymousPage';
import {ContractNotActivatedAuthorizedPage} from './authorized/ContractNotActivatedAuthorizedPage';

export const ContractNotActivatedComponent = () => {
    const {isAuthenticated} = useAuthContext();
    return isAuthenticated ? <ContractNotActivatedAuthorizedPage /> : <ContractNotActivatedAnonymousPage />;
};
