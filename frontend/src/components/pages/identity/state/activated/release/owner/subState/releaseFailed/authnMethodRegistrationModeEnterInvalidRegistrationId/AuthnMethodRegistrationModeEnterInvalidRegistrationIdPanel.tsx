import {Flex} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {i18} from 'frontend/src/i18';
import {useAuthnMethodRegistrationModeEnterInvalidRegistrationIdDataContext} from './AuthnMethodRegistrationModeEnterInvalidRegistrationIdDataProvider';
import {OkButton} from './button/OkButton';
import {RegistrationIdInput} from './RegistrationIdInput';

export const AuthnMethodRegistrationModeEnterInvalidRegistrationIdPanel = () => {
    return (
        <>
            <ErrorAlert message={i18.holder.state.release.releaseError.stub.authnMethodRegistrationModeEnterInvalidRegistrationId} />
            <Flex vertical gap={8}>
                <span className="gf-ant-color-secondary">{i18.holder.state.release.enterAuthnMethodRegistrationModeFail.form.registrationId.label}</span>
                <RegistrationIdInput />
            </Flex>
            <ErrorPanel />
            <OkButton />
        </>
    );
};

const ErrorPanel = () => {
    const {actionErrorPanel} = useAuthnMethodRegistrationModeEnterInvalidRegistrationIdDataContext();
    return actionErrorPanel;
};
