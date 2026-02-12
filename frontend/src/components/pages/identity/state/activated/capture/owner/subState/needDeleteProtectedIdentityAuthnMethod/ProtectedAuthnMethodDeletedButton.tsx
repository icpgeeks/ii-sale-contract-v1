import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {useNeedDeleteProtectedIdentityAuthnMethodDataContext} from './NeedDeleteProtectedIdentityAuthnMethodDataProvider';

export const ProtectedAuthnMethodDeletedButton = () => {
    const {buttonProps} = useNeedDeleteProtectedIdentityAuthnMethodDataContext();
    return <DefaultButton {...buttonProps} block />;
};
