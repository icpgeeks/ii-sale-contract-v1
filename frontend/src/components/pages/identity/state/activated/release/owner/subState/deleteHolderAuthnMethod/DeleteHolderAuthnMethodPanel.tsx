import {isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {ErrorAlert} from 'frontend/src/components/widgets/alert/ErrorAlert';
import {InfoAlert} from 'frontend/src/components/widgets/alert/InfoAlert';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {DefaultButton} from 'frontend/src/components/widgets/button/DefaultButton';
import {LinkButton} from 'frontend/src/components/widgets/button/LinkButton';
import {AbstractCheckbox} from 'frontend/src/components/widgets/form/AbstractCheckbox';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {i18} from 'frontend/src/i18';
import {hasProperty} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {useMemo} from 'react';
import {CapturePanelHeader} from '../../../../capture/common/CapturePanelHeader';
import {CaptureStepsRowRaw} from '../../../../capture/common/CaptureStepsRow';
import {HolderProcessingErrorPanel} from '../../../../common/processingError/HolderProcessingErrorPanel';
import {ReleasePanelHeader} from '../../../common/ReleasePanelHeader';
import {ReleaseStepsRowRaw} from '../../../common/ReleaseStepsRow';
import {Description} from '../checkingAccessFromOwnerAuthnMethod/CheckingAccessFromOwnerAuthnMethodPanel';
import {DangerousToLoseIdentityWarningMessage} from '../dangerousToLoseIdentity/DangerousToLoseIdentityPanel';
import {IdentityAPIChangedWarningMessage} from '../identityAPIChanged/IdentityAPIChangedPanel';

export const DeleteHolderAuthnMethodPanel = () => {
    const {stateUnion} = useIdentityHolderStateContext();
    const releaseInitiation = useMemo(() => {
        if (stateUnion?.type == 'Release') {
            return stateUnion.state.release_initiation;
        }
        return undefined;
    }, [stateUnion]);

    if (isNullish(releaseInitiation) || hasProperty(releaseInitiation, 'Manual')) {
        return <EmulateCheckingAccessFromOwnerAuthnMethodPage />;
    } else if (hasProperty(releaseInitiation, 'DangerousToLoseIdentity')) {
        return <EmulateDangerousToLoseIdentityPage />;
    } else if (hasProperty(releaseInitiation, 'IdentityAPIChanged')) {
        return <EmulateIdentityAPIChangedPage />;
    } else {
        // illegal state - we should not reach here
        return null;
    }
};

const EmulateDangerousToLoseIdentityPage = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <CapturePanelHeader />
                    <CaptureStepsRowRaw current={3} />
                </div>
                <ErrorAlert message={<DangerousToLoseIdentityWarningMessage />} />
                <HolderProcessingErrorPanel />
                <DefaultButton disabled loading>
                    {i18.holder.state.release.common.actionButton.restartTransfer}
                </DefaultButton>
            </Flex>
        </PanelCard>
    );
};

const EmulateIdentityAPIChangedPage = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <CapturePanelHeader />
                    <CaptureStepsRowRaw current={3} />
                </div>
                <ErrorAlert message={<IdentityAPIChangedWarningMessage />} />
                <HolderProcessingErrorPanel />
                <DefaultButton disabled loading>
                    {i18.holder.state.release.identityAPIChanged.button}
                </DefaultButton>
            </Flex>
        </PanelCard>
    );
};

const EmulateCheckingAccessFromOwnerAuthnMethodPage = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <ReleasePanelHeader />
                    <ReleaseStepsRowRaw current={2} />
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
                <InfoAlert message={i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.hint} />
                <AbstractCheckbox checked disabled>
                    {i18.holder.state.release.checkingAccessFromOwnerAuthnMethod.form.agreementCheckbox}
                </AbstractCheckbox>
                <HolderProcessingErrorPanel />
                <DefaultButton disabled loading>
                    {i18.common.button.confirmButton}
                </DefaultButton>
                <div className="gf-ta-center">
                    <LinkButton danger disabled>
                        {i18.holder.state.release.common.actionButton.restartTransfer}
                    </LinkButton>
                </div>
            </Flex>
        </PanelCard>
    );
};
