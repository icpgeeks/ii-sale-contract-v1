import {isEmptyString} from '@dfinity/utils';
import {Flex} from 'antd';
import {InfoAlert} from 'frontend/src/components/widgets/alert/InfoAlert';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {PrimaryButton} from 'frontend/src/components/widgets/button/PrimaryButton';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {useIdentityHolderContext, useIdentityHolderContextSafe} from 'frontend/src/context/identityHolder/IdentityHolderProvider';
import {useIdentityHolderLinkedAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderLinkedAssetsProvider';
import {i18} from 'frontend/src/i18';
import {ReleasePanelHeader} from '../../../common/ReleasePanelHeader';
import {ReleaseStepsRow} from '../../../common/ReleaseStepsRow';
import {RestartReleaseIdentityButtonContainer} from '../../common/restartReleaseIdentity/RestartReleaseIdentityButtonContainer';
import {AgreementCheckbox} from './AgreementCheckbox';
import {useCheckingAccessFromOwnerAuthnMethodDataContext} from './CheckingAccessFromOwnerAuthnMethodDataProvider';
import {useCheckingAccessFromOwnerAuthnMethodFormDataContext} from './CheckingAccessFromOwnerAuthnMethodFormDataProvider';

export const CheckingAccessFromOwnerAuthnMethodPanel = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <ReleasePanelHeader />
                    <ReleaseStepsRow />
                </div>
                <Description />
                <WarningAlert
                    message={
                        <div>
                            <div>{i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.warning}</div>
                            <div className="gf-strong">{i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.warningUndone}</div>
                        </div>
                    }
                />
                <MultipleAccountsHint />
                <InfoAlert message={i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.multipleAccessMethodsHint} />
                <AgreementCheckbox />
                <ErrorPanel />
                <ConfirmButton />
                <RestartReleaseIdentityButtonContainerWrapper />
            </Flex>
        </PanelCard>
    );
};

export const Description = () => {
    const {identityName} = useIdentityHolderContext();
    if (isEmptyString(identityName)) {
        return <div>{i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.description.nameEmpty}</div>;
    }
    return (
        <div>
            {i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.description.name.part1}
            {isEmptyString(identityName) ? '' : i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.description.name.part2(identityName)}
            {i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.description.name.part3}
        </div>
    );
};

const ConfirmButton = () => {
    const {
        formState: {userAgreementChecked}
    } = useCheckingAccessFromOwnerAuthnMethodFormDataContext();
    const {buttonProps} = useCheckingAccessFromOwnerAuthnMethodDataContext();
    const disabled = !userAgreementChecked || buttonProps.disabled;
    return (
        <PrimaryButton {...buttonProps} disabled={disabled}>
            {i18.common.button.confirmButton}
        </PrimaryButton>
    );
};

const ErrorPanel = () => {
    const {actionErrorPanel} = useCheckingAccessFromOwnerAuthnMethodDataContext();
    return actionErrorPanel;
};

const RestartReleaseIdentityButtonContainerWrapper = () => {
    const {actionInProgress} = useCheckingAccessFromOwnerAuthnMethodDataContext();
    return <RestartReleaseIdentityButtonContainer externalActionInProgress={actionInProgress} />;
};

export const MultipleAccountsHint = () => {
    const linkedAssets = useIdentityHolderLinkedAssetsContext();
    const {isCompletedSaleDealBuyer} = useIdentityHolderContextSafe();
    if (isCompletedSaleDealBuyer && linkedAssets.type == 'assets' && linkedAssets.identityAccounts.length > 1) {
        return <InfoAlert message={i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.multipleAccountsHint()} />;
    }
    return null;
};
