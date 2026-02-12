import {CheckCircleOutlined} from '@ant-design/icons';
import {isNullish} from '@dfinity/utils';
import {Steps, type StepProps} from 'antd';
import {LoadingIconWithProgress} from 'frontend/src/components/widgets/LoadingIconWithProgress';
import {useIdentityHolderAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderAssetsProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {getCaptureStepProps} from '../../../../capture/common/finalizeCapture/FinalizeCaptureSteps';
import {useFetchValidateAssetsDataContext, type HoldingStep} from './FetchValidateAssetsDataProvider';

export const FetchValidateAssetsSteps = () => {
    const {hasAssets} = useIdentityHolderAssetsContext();
    const {step} = useFetchValidateAssetsDataContext();

    const stepContext: StepContext = useMemo(() => {
        const shouldDisplayValidatingAssetsStep = hasAssets;
        const captureStepProps = getCaptureStepProps();
        const holdingStepProps = getHoldingStepProps();
        const items = hasAssets ? holdingStepProps : captureStepProps.concat(holdingStepProps);
        const startIndexFrom = hasAssets ? 0 : captureStepProps.length;
        return getHoldingStepContextFrom(step, items, startIndexFrom, shouldDisplayValidatingAssetsStep);
    }, [step, hasAssets]);

    if (isNullish(step) || step.type == 'n/a') {
        return null;
    }

    return <Steps current={stepContext.current} items={stepContext.items} labelPlacement="vertical" direction="vertical" />;
};

type StepContext = {
    current: number;
    items: Array<StepProps>;
};

export const getHoldingStepProps = (): Array<StepProps> => {
    return [
        {title: i18.holder.state.holding.fetchingAssets.connectingToNNS, status: undefined},
        {title: i18.holder.state.holding.fetchingAssets.fetchingNeurons.simple, status: undefined},
        {title: i18.holder.state.holding.fetchingAssets.removingHotkeys.simple, status: undefined},
        {title: i18.holder.state.holding.fetchingAssets.fetchingAccounts.simple, status: undefined},
        {title: i18.holder.state.holding.fetchingAssets.checkingForUnspentAllowances.simple, status: undefined}
    ];
};

const getHoldingStepContextFrom = (step: HoldingStep | undefined, items: Array<StepProps>, startIndexFrom: number, shouldDisplayValidatingAssetsStep: boolean): StepContext => {
    let current = -1;

    const getIndex = (offset: number) => offset + startIndexFrom;

    if (shouldDisplayValidatingAssetsStep) {
        items.push({
            title: i18.holder.state.holding.fetchingAssets.validatingAssets,
            status: undefined
        });
    }

    if (isNullish(step) || step.type == 'n/a') {
        current = getIndex(0);
        items[current].icon = <LoadingIconWithProgress />;
    } else {
        switch (step.type) {
            case 'obtainDelegation': {
                current = getIndex(0);
                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'neuronIds': {
                current = getIndex(1);
                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'neurons': {
                current = getIndex(1);

                if (step.neuronsLeft > 0) {
                    items[current].title = (
                        <div>
                            <span>{i18.holder.state.holding.fetchingAssets.fetchingNeurons.simple}</span>{' '}
                            <span className="gf-font-size-small">{i18.holder.state.holding.fetchingAssets.fetchingNeurons.detailed(step.neuronsLeft)}</span>
                        </div>
                    );
                }

                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'deletingNeuronHotkeys': {
                current = getIndex(2);

                if (step.hotkeysLeft > 0) {
                    items[current].title = (
                        <div>
                            <span>{i18.holder.state.holding.fetchingAssets.removingHotkeys.simple}</span>{' '}
                            <span className="gf-font-size-small">{i18.holder.state.holding.fetchingAssets.removingHotkeys.detailed(step.hotkeysLeft)}</span>
                        </div>
                    );
                }

                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'accounts': {
                current = getIndex(3);
                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'accountBalances': {
                current = getIndex(3);

                if (step.accountsLeft > 0) {
                    items[current].title = (
                        <div>
                            <span>{i18.holder.state.holding.fetchingAssets.fetchingAccounts.simple}</span>{' '}
                            <span className="gf-font-size-small">{i18.holder.state.holding.fetchingAssets.fetchingAccounts.detailed(step.accountsLeft)}</span>
                        </div>
                    );
                }

                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'assetsFetchedButNotChecked': {
                current = getIndex(4);
                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'checkAccountApproves': {
                current = getIndex(4);

                if (step.accountsLeft > 0) {
                    items[current].title = (
                        <div>
                            <span>{i18.holder.state.holding.fetchingAssets.checkingForUnspentAllowances.simple}</span>{' '}
                            <span className="gf-font-size-small">{i18.holder.state.holding.fetchingAssets.checkingForUnspentAllowances.detailed(step.accountsLeft)}</span>
                        </div>
                    );
                }

                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'validatingAssets': {
                if (shouldDisplayValidatingAssetsStep) {
                    current = getIndex(5);
                    items[current].icon = <LoadingIconWithProgress />;
                }
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
