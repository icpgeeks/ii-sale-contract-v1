import {CheckCircleOutlined, ExportOutlined} from '@ant-design/icons';
import {isNullish, nonNullish} from '@dfinity/utils';
import {Steps, type StepProps} from 'antd';
import {RouterPaths} from 'frontend/src/components/pages/skeleton/Router';
import {ErrorAlertWithAction} from 'frontend/src/components/widgets/alert/ErrorAlertWithAction';
import {ExternalLink} from 'frontend/src/components/widgets/ExternalLink';
import {LoadingIconWithProgress} from 'frontend/src/components/widgets/LoadingIconWithProgress';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {getHoldingStepProps} from '../../../holding/subState/common/refetchValidateAssets/FetchValidateAssetsSteps';
import {
    NeedDeleteProtectedIdentityAuthnMethodDataProvider,
    useNeedDeleteProtectedIdentityAuthnMethodDataContext
} from '../../owner/subState/needDeleteProtectedIdentityAuthnMethod/NeedDeleteProtectedIdentityAuthnMethodDataProvider';
import {ProtectedAuthnMethodDeletedButton} from '../../owner/subState/needDeleteProtectedIdentityAuthnMethod/ProtectedAuthnMethodDeletedButton';
import {useFinalizeCaptureStepsDataContext, type CaptureStep} from './FinalizeCaptureStepsDataProvider';

export const FinalizeCaptureSteps = () => {
    const {step} = useFinalizeCaptureStepsDataContext();

    const stepContext: StepContext = useMemo(() => {
        const captureStepContext = getCaptureStepContextFrom(step);

        return {
            current: captureStepContext.current,
            items: [...captureStepContext.items, ...getHoldingStepProps()]
        };
    }, [step]);

    if (isNullish(step) || step.type == 'n/a') {
        return null;
    }

    return <Steps current={stepContext.current} items={stepContext.items} labelPlacement="vertical" direction="vertical" size="default" />;
};

type StepContext = {
    current: number;
    items: Array<StepProps>;
};

export const getCaptureStepProps = (): Array<StepProps> => {
    return [
        {title: i18.holder.state.capture.finalizingCapture.verifyingInternetIdentity, status: undefined},
        {title: i18.holder.state.capture.finalizingCapture.removingPasskeys.simple, status: undefined}
    ];
};

const getCaptureStepContextFrom = (step: CaptureStep | undefined): StepContext => {
    let current = -1;
    const items: Array<StepProps> = getCaptureStepProps();
    if (isNullish(step) || step.type == 'n/a') {
        current = 0;
        items[current].icon = <LoadingIconWithProgress />;
    } else {
        switch (step.type) {
            case 'verifyingPrincipal': {
                current = 0;
                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'protectedDeviceDetected': {
                current = 1;
                items[current].icon = undefined;
                items[current].status = 'error';
                items[current].description = (
                    <NeedDeleteProtectedIdentityAuthnMethodDataProvider>
                        <ProtectedDeviceDetectedStepDescription />
                    </NeedDeleteProtectedIdentityAuthnMethodDataProvider>
                );
                break;
            }
            case 'removingDevices': {
                current = 1;

                if (step.passkeysLeft > 0) {
                    items[current].title = (
                        <div>
                            <span>{i18.holder.state.capture.finalizingCapture.removingPasskeys.simple}</span>{' '}
                            <span className="gf-font-size-small">{i18.holder.state.capture.finalizingCapture.removingPasskeys.detailed(step.passkeysLeft)}</span>
                        </div>
                    );
                }

                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            default: {
                const exhaustiveCheck: never = step;
                applicationLogger.error(exhaustiveCheckFailedMessage, exhaustiveCheck);
            }
        }
    }

    for (let i = 0; i < current; i++) {
        items[i].icon = <CheckCircleOutlined style={{fontSize: 32, color: 'green'}} />;
    }

    return {current, items};
};

const ProtectedDeviceDetectedStepDescription = () => {
    const {actionErrorPanel} = useNeedDeleteProtectedIdentityAuthnMethodDataContext();
    if (nonNullish(actionErrorPanel)) {
        return actionErrorPanel;
    }
    return (
        <>
            <ErrorAlertWithAction
                message={
                    <span>
                        {`${i18.holder.state.capture.needDeleteProtectedIdentityAuthnMethod.description1} `}
                        <ExternalLink href={RouterPaths.externalFAQPage('transfer-to')}>
                            <span className="gf-underline gf-underline-hover">{i18.holder.state.capture.needDeleteProtectedIdentityAuthnMethod.descriptionLinkToInstructions}</span>{' '}
                            <ExportOutlined className="gf-font-size-smaller" />
                        </ExternalLink>
                        {` ${i18.holder.state.capture.needDeleteProtectedIdentityAuthnMethod.description2}`}
                    </span>
                }
                action={<ProtectedAuthnMethodDeletedButton />}
            />
        </>
    );
};
