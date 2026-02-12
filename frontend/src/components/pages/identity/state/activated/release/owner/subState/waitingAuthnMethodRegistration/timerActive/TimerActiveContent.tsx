import {ExportOutlined} from '@ant-design/icons';
import {isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {ExternalLink} from 'frontend/src/components/widgets/ExternalLink';
import {PanelCard} from 'frontend/src/components/widgets/PanelCard';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {useWindowSize} from 'frontend/src/hook/useWindowSize';
import {i18} from 'frontend/src/i18';
import {mergeClassName} from 'frontend/src/utils/core/dom/domUtils';
import {getSingleEntryUnion} from 'frontend/src/utils/core/typescript/typescriptAddons';
import {useMemo} from 'react';
import {buildPairURL} from '../../../../../waitingStartCapture/owner/registrationIdUtils';
import {ReleasePanelHeader} from '../../../../common/ReleasePanelHeader';
import {ReleaseStepsRow} from '../../../../common/ReleaseStepsRow';
import {RestartReleaseIdentityButtonContainer} from '../../../common/restartReleaseIdentity/RestartReleaseIdentityButtonContainer';
import {useWaitingAuthnMethodRegistrationDataContext} from '../WaitingAuthnMethodRegistrationDataProvider';
import {ConfirmOwnerAuthnMethodRegistrationButton} from './ConfirmOwnerAuthnMethodRegistrationButton';
import {StepsComponent} from './StepsComponent';
import {VerificationCodeInput} from './VerificationCodeInput';

export const TimerActiveContent = () => {
    return (
        <PanelCard>
            <Flex vertical gap={16}>
                <div>
                    <ReleasePanelHeader />
                    <ReleaseStepsRow />
                </div>
                <Description />
                <div>
                    <StepsComponent link={<PairLink />} input={<VerificationCodeInput />} />
                    <ErrorPanel />
                </div>
                <ConfirmOwnerAuthnMethodRegistrationButton />
                <RestartReleaseIdentityButtonContainerWrapper />
            </Flex>
        </PanelCard>
    );
};

export const PairLink = () => {
    const {width: screenWidth} = useWindowSize(20);
    const isSmallFontSize = screenWidth < 350;

    const {getStateSubState} = useIdentityHolderStateContext();
    const registrationId = useMemo<string | undefined>(() => {
        const subState = getStateSubState('Release');
        const stateUnion = getSingleEntryUnion(subState);
        if (isNullish(stateUnion)) {
            return undefined;
        }
        switch (stateUnion.type) {
            case 'WaitingAuthnMethodRegistration':
            case 'ConfirmAuthnMethodRegistration': {
                return stateUnion.state.registration_id;
            }
            case 'DangerousToLoseIdentity':
            case 'IdentityAPIChanged':
            case 'DeleteHolderAuthnMethod':
            case 'StartRelease':
            case 'ReleaseFailed':
            case 'EnterAuthnMethodRegistrationMode':
            case 'EnsureOrphanedRegistrationExited':
            case 'CheckingAccessFromOwnerAuthnMethod': {
                return undefined;
            }
            default: {
                const exhaustiveCheck: never = stateUnion;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
                return undefined;
            }
        }
    }, [getStateSubState]);

    const wrapperClassName = useMemo(() => {
        return mergeClassName('gf-noWrap', isSmallFontSize ? 'gf-font-size-small' : undefined);
    }, [isSmallFontSize]);

    if (isNullish(registrationId)) {
        // illegal state - we should not reach here
        return null;
    }

    return (
        <span className={wrapperClassName}>
            <ExternalLink href={`${buildPairURL(registrationId)}`} className="gf-underline gf-underline-hover">
                {buildPairURL(registrationId)}
            </ExternalLink>{' '}
            <ExportOutlined className="gf-font-size-smaller" />
        </span>
    );
};

export const Description = () => {
    return <div>{i18.holder.state.release.waitingAuthnMethodRegistration.description}</div>;
};

const RestartReleaseIdentityButtonContainerWrapper = () => {
    const {actionInProgress} = useWaitingAuthnMethodRegistrationDataContext();
    return <RestartReleaseIdentityButtonContainer externalActionInProgress={actionInProgress} />;
};

const ErrorPanel = () => {
    const {actionErrorPanel} = useWaitingAuthnMethodRegistrationDataContext();
    return actionErrorPanel;
};
