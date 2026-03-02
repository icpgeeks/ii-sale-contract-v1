import {CheckCircleOutlined} from '@ant-design/icons';
import {isNullish, nonNullish} from '@dfinity/utils';
import {Steps, type StepProps} from 'antd';
import {LoadingIconWithProgress} from 'frontend/src/components/widgets/LoadingIconWithProgress';
import {useIdentityHolderAssetsContext} from 'frontend/src/context/identityHolder/state/holding/IdentityHolderAssetsProvider';
import {applicationLogger} from 'frontend/src/context/logger/logger';
import {exhaustiveCheckFailedMessage} from 'frontend/src/context/logger/loggerConstants';
import {i18} from 'frontend/src/i18';
import {useMemo} from 'react';
import {getCaptureStepProps} from '../../../../capture/common/finalizeCapture/FinalizeCaptureSteps';
import {FetchNnsAssetsSteps} from './FetchNnsAssetsSteps';
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
        const ctx = getHoldingStepContextFrom(step, items, startIndexFrom, shouldDisplayValidatingAssetsStep);
        if (nonNullish(step) && step.type === 'fetchingNnsAssetsForAccount') {
            const nnsItemIndex = startIndexFrom + 1;
            ctx.items[nnsItemIndex] = {
                ...ctx.items[nnsItemIndex],
                description: <FetchNnsAssetsSteps />
            };
        }
        return ctx;
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
        {title: i18.holder.state.holding.fetchingAssets.fetchingIdentityAccounts, status: undefined},
        {title: i18.holder.state.holding.fetchingAssets.fetchingNnsAssets.simple, status: undefined},
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
            case 'fetchingIdentityAccounts': {
                current = getIndex(0);
                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'fetchingNnsAssetsForAccount': {
                current = getIndex(1);
                items[current].title = (
                    <div>
                        <span>{i18.holder.state.holding.fetchingAssets.fetchingNnsAssets.simple}</span>{' '}
                        <span className="gf-font-size-small">{i18.holder.state.holding.fetchingAssets.fetchingNnsAssets.detailed(step.currentAccountIndex, step.totalAccounts)}</span>
                    </div>
                );
                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'assetsFetchedButNotChecked': {
                current = getIndex(2);
                items[current].icon = <LoadingIconWithProgress />;
                break;
            }
            case 'checkAccountApproves': {
                current = getIndex(2);
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
                    current = getIndex(3);
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
